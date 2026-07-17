import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CancelledBy, ProductStatus, ShopOrderStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const ORDER_INCLUDE = {
  address: true,
  payment: true,
  shopOrders: {
    include: {
      shop: { select: { id: true, name: true } },
      orderItems: { include: { product: { select: { id: true, name: true } } } },
    },
  },
};

const SHOP_ORDER_INCLUDE = {
  order: {
    include: {
      customer: { select: { id: true, fullName: true, email: true, phone: true } },
      address: true,
      payment: true,
    },
  },
  orderItems: { include: { product: { select: { id: true, name: true } } } },
};

const STATUS_LABEL_VI: Record<ShopOrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

const ALLOWED_TRANSITIONS: Record<ShopOrderStatus, ShopOrderStatus[]> = {
  PENDING: [ShopOrderStatus.CONFIRMED, ShopOrderStatus.CANCELLED],
  CONFIRMED: [ShopOrderStatus.SHIPPING, ShopOrderStatus.CANCELLED],
  SHIPPING: [ShopOrderStatus.DELIVERED, ShopOrderStatus.RETURNED],
  DELIVERED: [ShopOrderStatus.RETURNED],
  CANCELLED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkout(customerId: string, dto: CreateOrderDto) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: customerId },
      include: { product: { include: { shop: true } } },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const address = await this.prisma.address.findUnique({ where: { id: dto.addressId } });
    if (!address || address.userId !== customerId) {
      throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
    }

    for (const item of cartItems) {
      if (
        item.product.status !== ProductStatus.ACTIVE ||
        item.product.shop.status !== ShopStatus.APPROVED
      ) {
        throw new BadRequestException(`Sản phẩm "${item.product.name}" hiện không khả dụng`);
      }
      if (item.quantity > item.product.stock) {
        throw new BadRequestException(
          `Sản phẩm "${item.product.name}" chỉ còn ${item.product.stock} trong kho`,
        );
      }
    }

    const groupsByShop = new Map<string, typeof cartItems>();
    for (const item of cartItems) {
      const group = groupsByShop.get(item.product.shopId) ?? [];
      group.push(item);
      groupsByShop.set(item.product.shopId, group);
    }

    const shopOrdersData = Array.from(groupsByShop.entries()).map(([shopId, items]) => {
      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );
      return {
        shopId,
        status: ShopOrderStatus.PENDING,
        subtotal,
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            nameSnapshot: item.product.name,
            unitPrice: item.product.price,
            quantity: item.quantity,
          })),
        },
      };
    });

    const subtotalAmount = shopOrdersData.reduce((sum, group) => sum + group.subtotal, 0);

    const voucherApplication = dto.voucherCode
      ? await this.vouchersService.findValidVoucher(dto.voucherCode, customerId, cartItems)
      : null;
    const discountAmount = voucherApplication?.discountAmount ?? 0;
    const totalAmount = subtotalAmount - discountAmount;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          addressId: address.id,
          recipientName: address.recipientName,
          recipientPhone: address.phone,
          shippingAddress: `${address.line}, ${address.city}`,
          paymentMethod: dto.paymentMethod,
          totalAmount,
          voucherCode: voucherApplication?.code,
          discountAmount,
          shopOrders: { create: shopOrdersData },
          payment: { create: { method: dto.paymentMethod } },
        },
        include: ORDER_INCLUDE,
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (voucherApplication) {
        await tx.voucherRedemption.create({
          data: {
            voucherId: voucherApplication.voucherId,
            userId: customerId,
            orderId: created.id,
            amount: discountAmount,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: customerId } });

      return created;
    });

    await this.notifyNewOrder(cartItems);

    return order;
  }

  private async notifyNewOrder(cartItems: { product: { shop: { ownerId: string } } }[]) {
    const ownerIds = new Set(cartItems.map((item) => item.product.shop.ownerId));
    await Promise.all(
      Array.from(ownerIds).map((ownerId) =>
        this.notificationsService.create({
          userId: ownerId,
          type: 'NEW_ORDER',
          title: 'Bạn có đơn hàng mới',
          body: 'Một khách hàng vừa đặt hàng tại shop của bạn',
          link: '/seller/orders',
        }),
      ),
    );
  }

  async findMine(customerId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { customerId };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findMineOne(customerId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  async adminList(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        include: {
          ...ORDER_INCLUDE,
          customer: { select: { id: true, fullName: true, email: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return { items, total, page, pageSize };
  }

  private async getOwnedShopOrThrow(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  async findForSeller(ownerId: string, query: PaginationQueryDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { shopId: shop.id };

    const [items, total] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where,
        include: SHOP_ORDER_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shopOrder.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  private async applyStatusChange(
    shopOrderId: string,
    orderItems: { productId: string; quantity: number }[],
    status: ShopOrderStatus,
    cancelInfo?: { reason: string; by: CancelledBy },
  ) {
    if (status === ShopOrderStatus.CANCELLED || status === ShopOrderStatus.RETURNED) {
      await this.prisma.$transaction([
        ...orderItems.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
        this.prisma.shopOrder.update({
          where: { id: shopOrderId },
          data: {
            status,
            cancelReason: cancelInfo?.reason,
            cancelledBy: cancelInfo?.by,
          },
        }),
      ]);
    } else {
      await this.prisma.shopOrder.update({ where: { id: shopOrderId }, data: { status } });
    }

    return this.prisma.shopOrder.findUnique({
      where: { id: shopOrderId },
      include: SHOP_ORDER_INCLUDE,
    });
  }

  async updateShopOrderStatus(
    ownerId: string,
    shopOrderId: string,
    status: ShopOrderStatus,
    reason?: string,
  ) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const shopOrder = await this.prisma.shopOrder.findUnique({
      where: { id: shopOrderId },
      include: { orderItems: true },
    });
    if (!shopOrder || shopOrder.shopId !== shop.id) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const allowed = ALLOWED_TRANSITIONS[shopOrder.status];
    if (!allowed.includes(status)) {
      throw new ForbiddenException(
        `Không thể chuyển trạng thái từ ${shopOrder.status} sang ${status}`,
      );
    }

    const isCancelLike = status === ShopOrderStatus.CANCELLED || status === ShopOrderStatus.RETURNED;
    const updated = await this.applyStatusChange(
      shopOrderId,
      shopOrder.orderItems,
      status,
      isCancelLike ? { reason: reason ?? 'Người bán hủy đơn', by: CancelledBy.SELLER } : undefined,
    );

    if (updated) {
      await this.notificationsService.create({
        userId: updated.order.customerId,
        type: 'ORDER_STATUS_CHANGED',
        title: 'Đơn hàng của bạn có cập nhật mới',
        body: `Đơn hàng chuyển sang trạng thái: ${STATUS_LABEL_VI[status]}`,
        link: `/orders/${updated.orderId}`,
      });
    }

    return updated;
  }

  async cancelByCustomer(customerId: string, shopOrderId: string, reason: string) {
    const shopOrder = await this.prisma.shopOrder.findUnique({
      where: { id: shopOrderId },
      include: { orderItems: true, order: true, shop: true },
    });
    if (!shopOrder || shopOrder.order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const allowed = ALLOWED_TRANSITIONS[shopOrder.status].includes(ShopOrderStatus.CANCELLED);
    if (!allowed) {
      throw new ForbiddenException(
        `Đơn hàng đang ở trạng thái "${shopOrder.status}", không thể hủy`,
      );
    }

    const updated = await this.applyStatusChange(
      shopOrderId,
      shopOrder.orderItems,
      ShopOrderStatus.CANCELLED,
      { reason, by: CancelledBy.CUSTOMER },
    );

    await this.notificationsService.create({
      userId: shopOrder.shop.ownerId,
      type: 'ORDER_STATUS_CHANGED',
      title: 'Khách hàng đã hủy đơn hàng',
      body: `Lý do: ${reason}`,
      link: '/seller/orders',
    });

    return updated;
  }
}
