import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CancelledBy, Prisma, Role, ShopOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  requestRefund,
  restoreStock,
  syncPayment,
  syncProduct,
  transact,
} from '../common/commerce';
import {
  CreateReturnDto,
  ResolveReturnDto,
  ShippingDto,
} from './dto/fulfillment.dto';
import type { AuthUser } from '../auth/types/auth-user.type';

const DETAILS = {
  shop: { select: { id: true, name: true } },
  orderItems: { include: { product: { select: { id: true, name: true } } } },
  history: { orderBy: { createdAt: 'asc' as const } },
  returnRequest: true,
  refunds: true,
};
const ORDER_INCLUDE = {
  payment: true,
  refunds: true,
  shopOrders: { include: DETAILS },
};
const SELLER_INCLUDE = {
  ...DETAILS,
  order: {
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
      payment: true,
    },
  },
};
const LINE_INCLUDE = { variant: true, product: { include: { shop: true } } };
const TRANSITIONS: Record<ShopOrderStatus, ShopOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private logger = new Logger(OrdersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
    private readonly notificationsService: NotificationsService,
  ) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.expireUnpaid().catch((e) => this.logger.error(e));
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async quoteIn(
    tx: Prisma.TransactionClient,
    customerId: string,
    dto: CreateOrderDto,
  ) {
    if (dto.directItem && dto.cartItemIds)
      throw new BadRequestException('Chỉ chọn mua ngay hoặc giỏ hàng');
    let items: Prisma.CartItemGetPayload<{ include: typeof LINE_INCLUDE }>[];
    if (dto.directItem) {
      const p = await tx.product.findUnique({
        where: { id: dto.directItem.productId },
        include: { shop: true, variants: { where: { isActive: true } } },
      });
      if (!p) throw new NotFoundException('Không tìm thấy sản phẩm');
      const variant = dto.directItem.variantId
        ? p.variants.find((v) => v.id === dto.directItem!.variantId)
        : p.variants.length === 1
          ? p.variants[0]
          : null;
      if (!variant) throw new BadRequestException('Vui lòng chọn phân loại');
      items = [
        {
          id: '',
          userId: customerId,
          productId: p.id,
          variantId: variant.id,
          quantity: dto.directItem.quantity,
          createdAt: new Date(),
          product: p,
          variant,
        },
      ];
    } else {
      if (dto.cartItemIds?.length === 0)
        throw new BadRequestException('Chọn ít nhất một sản phẩm');
      items = await tx.cartItem.findMany({
        where: {
          userId: customerId,
          ...(dto.cartItemIds ? { id: { in: dto.cartItemIds } } : {}),
        },
        include: LINE_INCLUDE,
      });
      if (dto.cartItemIds && items.length !== dto.cartItemIds.length)
        throw new BadRequestException(
          'Giỏ hàng đã thay đổi, vui lòng chọn lại',
        );
    }
    if (!items.length) throw new BadRequestException('Giỏ hàng đang trống');
    for (const i of items) {
      if (
        i.product.status !== 'ACTIVE' ||
        i.product.shop.status !== 'APPROVED' ||
        !i.variant.isActive
      )
        throw new BadRequestException(
          `Sản phẩm ${i.product.name} không khả dụng`,
        );
      if (i.quantity > i.variant.stock)
        throw new BadRequestException(
          `${i.product.name} - ${i.variant.name} chỉ còn ${i.variant.stock}`,
        );
    }
    const voucher = dto.voucherCode
      ? await this.vouchersService.findValidVoucher(
          dto.voucherCode,
          customerId,
          items.map((i) => ({
            ...i,
            product: { ...i.product, price: i.variant.price },
          })),
          tx,
        )
      : null;
    const shopIds = [...new Set(items.map((i) => i.product.shopId))].sort();
    const bases = shopIds.map((shopId) =>
      items
        .filter((i) => i.product.shopId === shopId)
        .reduce((s, i) => s + Number(i.variant.price) * i.quantity, 0),
    );
    const eligibleTotal = bases.reduce(
      (s, base, idx) =>
        s +
        (!voucher ||
        voucher.scope === 'PLATFORM' ||
        voucher.shopId === shopIds[idx]
          ? base
          : 0),
      0,
    );
    let cumulative = 0;
    const shops = shopIds.map((shopId, idx) => {
      const base = bases[idx];
      const eligible =
        !voucher || voucher.scope === 'PLATFORM' || voucher.shopId === shopId
          ? base
          : 0;
      const before = cumulative;
      cumulative += eligible;
      const discountAmount =
        voucher && eligibleTotal
          ? Math.round((voucher.discountAmount * cumulative) / eligibleTotal) -
            Math.round((voucher.discountAmount * before) / eligibleTotal)
          : 0;
      const shippingFee = base >= 500000 ? 0 : 30000;
      return {
        shopId,
        shopName: items.find((i) => i.product.shopId === shopId)!.product.shop
          .name,
        subtotal: base,
        discountAmount,
        shippingFee,
        totalAmount: base - discountAmount + shippingFee,
      };
    });
    return {
      items,
      shops,
      voucher,
      subtotal: bases.reduce((s, x) => s + x, 0),
      discountAmount: voucher?.discountAmount ?? 0,
      shippingFee: shops.reduce((s, x) => s + x.shippingFee, 0),
      totalAmount: shops.reduce((s, x) => s + x.totalAmount, 0),
    };
  }
  async quote(customerId: string, dto: CreateOrderDto) {
    return transact(this.prisma, (tx) => this.quoteIn(tx, customerId, dto));
  }

  async checkout(customerId: string, dto: CreateOrderDto) {
    await this.expireUnpaid();
    const result = await transact(this.prisma, async (tx) => {
      // Serialize checkout per customer; retries also protect voucher and stock predicates.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${customerId}, 0))`;
      if (dto.idempotencyKey) {
        const existing = await tx.order.findUnique({
          where: {
            customerId_checkoutKey: {
              customerId,
              checkoutKey: dto.idempotencyKey,
            },
          },
          include: ORDER_INCLUDE,
        });
        if (existing) return { order: existing, owners: [] as string[] };
      }
      const q = await this.quoteIn(tx, customerId, dto);
      const address = await tx.address.findFirst({
        where: { id: dto.addressId, userId: customerId },
      });
      if (!address)
        throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
      for (const i of q.items) {
        const updated = await tx.productVariant.updateMany({
          where: {
            id: i.variantId,
            isActive: true,
            stock: { gte: i.quantity },
          },
          data: { stock: { decrement: i.quantity } },
        });
        if (updated.count !== 1)
          throw new ConflictException('Tồn kho đã thay đổi, vui lòng thử lại');
      }
      for (const id of new Set(q.items.map((i) => i.productId)))
        await syncProduct(tx, id);
      const order = await tx.order.create({
        data: {
          customerId,
          checkoutKey: dto.idempotencyKey,
          addressId: address.id,
          recipientName: address.recipientName,
          recipientPhone: address.phone,
          shippingAddress: `${address.line}, ${address.city}`,
          paymentMethod: dto.paymentMethod,
          totalAmount: q.totalAmount,
          discountAmount: q.discountAmount,
          voucherCode: q.voucher?.code,
          paymentStatus: q.totalAmount === 0 ? 'PAID' : 'PENDING',
          expiresAt:
            dto.paymentMethod === 'MOMO'
              ? new Date(Date.now() + 30 * 60000)
              : null,
          payment: {
            create: {
              method: dto.paymentMethod,
              status: q.totalAmount === 0 ? 'PAID' : 'PENDING',
            },
          },
          shopOrders: {
            create: q.shops.map((s) => ({
              shopId: s.shopId,
              subtotal: s.subtotal,
              discountAmount: s.discountAmount,
              shippingFee: s.shippingFee,
              totalAmount: s.totalAmount,
              history: {
                create: {
                  status: 'PENDING',
                  actorId: customerId,
                  note: 'Khách hàng đặt đơn',
                },
              },
              orderItems: {
                create: q.items
                  .filter((i) => i.product.shopId === s.shopId)
                  .map((i) => ({
                    productId: i.productId,
                    variantId: i.variantId,
                    nameSnapshot: i.product.name,
                    variantSnapshot: i.variant.name,
                    skuSnapshot: i.variant.sku,
                    unitPrice: i.variant.price,
                    quantity: i.quantity,
                  })),
              },
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
      if (q.voucher)
        await tx.voucherRedemption.create({
          data: {
            voucherId: q.voucher.voucherId,
            userId: customerId,
            orderId: order.id,
            amount: q.discountAmount,
          },
        });
      if (!dto.directItem)
        await tx.cartItem.deleteMany({
          where: { userId: customerId, id: { in: q.items.map((i) => i.id) } },
        });
      return {
        order,
        owners: [...new Set(q.items.map((i) => i.product.shop.ownerId))],
      };
    });
    for (const userId of result.owners)
      await this.notify(
        userId,
        'Bạn có đơn hàng mới',
        'Khách hàng vừa đặt hàng tại shop của bạn',
        '/seller/orders',
      );
    return result.order;
  }

  async expireUnpaid() {
    const expired = await this.prisma.order.findMany({
      where: {
        paymentMethod: 'MOMO',
        paymentStatus: { in: ['PENDING', 'FAILED'] },
        expiresAt: { lte: new Date() },
        shopOrders: { some: { status: 'PENDING' } },
      },
      select: { id: true },
      take: 100,
    });
    for (const order of expired)
      await transact(this.prisma, async (tx) => {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { shopOrders: true },
        });
        if (
          !['PENDING', 'FAILED'].includes(current.paymentStatus) ||
          !current.expiresAt ||
          current.expiresAt > new Date()
        )
          return;
        for (const s of current.shopOrders.filter(
          (s) => s.status === 'PENDING',
        ))
          await this.cancelIn(
            tx,
            s.id,
            null,
            'Hết thời gian thanh toán',
            'ADMIN',
          );
      });
  }
  private async cancelIn(
    tx: Prisma.TransactionClient,
    id: string,
    actorId: string | null,
    reason: string,
    by: CancelledBy,
  ) {
    const so = await tx.shopOrder.findUniqueOrThrow({ where: { id } });
    const update = await tx.shopOrder.updateMany({
      where: { id, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED', cancelReason: reason, cancelledBy: by },
    });
    if (update.count !== 1)
      throw new ConflictException('Đơn đã được cập nhật, không thể hủy');
    await restoreStock(tx, id);
    await tx.orderStatusHistory.create({
      data: { shopOrderId: id, status: 'CANCELLED', actorId, note: reason },
    });
    await requestRefund(tx, id, reason);
    const active = await tx.shopOrder.count({
      where: {
        orderId: so.orderId,
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
    });
    if (!active)
      await tx.voucherRedemption.deleteMany({ where: { orderId: so.orderId } });
    await syncPayment(tx, so.orderId);
  }
  private async notify(
    userId: string,
    title: string,
    body: string,
    link: string,
  ) {
    try {
      await this.notificationsService.create({
        userId,
        type: 'ORDER_STATUS_CHANGED',
        title,
        body,
        link,
      });
    } catch (e) {
      this.logger.error('Không thể gửi thông báo', e);
    }
  }
  async findMine(customerId: string, q: PaginationQueryDto) {
    await this.expireUnpaid();
    return this.list({ customerId }, q);
  }
  async findMineOne(customerId: string, id: string) {
    await this.expireUnpaid();
    const order = await this.prisma.order.findFirst({
      where: { id, customerId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }
  private async list(where: Prisma.OrderWhereInput, q: PaginationQueryDto) {
    const page = q.page ?? 1,
      pageSize = q.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          ...ORDER_INCLUDE,
          customer: { select: { fullName: true, email: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
  adminList(q: PaginationQueryDto) {
    return this.list({}, q);
  }
  async findForSeller(ownerId: string, q: PaginationQueryDto) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    const page = q.page ?? 1,
      pageSize = q.pageSize ?? 20,
      where = { shopId: shop.id };
    const [items, total] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where,
        include: SELLER_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shopOrder.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
  async updateShopOrderStatus(
    ownerId: string,
    id: string,
    status: ShopOrderStatus,
    reason?: string,
  ) {
    const result = await transact(this.prisma, async (tx) => {
      const so = await tx.shopOrder.findFirst({
        where: { id, shop: { ownerId } },
        include: { order: true },
      });
      if (!so) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (!TRANSITIONS[so.status].includes(status))
        throw new ForbiddenException('Không thể chuyển trạng thái này');
      if (status === 'CANCELLED')
        await this.cancelIn(
          tx,
          id,
          ownerId,
          reason?.trim() || 'Người bán hủy đơn',
          'SELLER',
        );
      else {
        if (
          so.order.paymentMethod === 'MOMO' &&
          Number(so.paidAmount) < Number(so.totalAmount)
        )
          throw new BadRequestException('Đơn MoMo chưa được thanh toán');
        if (status === 'SHIPPING' && (!so.carrier || !so.trackingCode))
          throw new BadRequestException(
            'Vui lòng nhập đơn vị vận chuyển và mã vận đơn trước',
          );
        const updated = await tx.shopOrder.updateMany({
          where: { id, status: so.status },
          data: {
            status,
            ...(status === 'DELIVERED'
              ? {
                  deliveredAt: new Date(),
                  ...(so.order.paymentMethod === 'COD'
                    ? { paidAmount: so.totalAmount }
                    : {}),
                }
              : {}),
          },
        });
        if (!updated.count)
          throw new ConflictException('Trạng thái đã thay đổi');
        await tx.orderStatusHistory.create({
          data: { shopOrderId: id, status, actorId: ownerId },
        });
        await syncPayment(tx, so.orderId);
      }
      return tx.shopOrder.findUniqueOrThrow({
        where: { id },
        include: SELLER_INCLUDE,
      });
    });
    await this.notify(
      result.order.customerId,
      'Đơn hàng được cập nhật',
      `Trạng thái: ${status}`,
      `/orders/${result.orderId}`,
    );
    return result;
  }
  async cancelByCustomer(customerId: string, id: string, reason: string) {
    const result = await transact(this.prisma, async (tx) => {
      const so = await tx.shopOrder.findFirst({
        where: { id, order: { customerId } },
      });
      if (!so) throw new NotFoundException('Không tìm thấy đơn hàng');
      await this.cancelIn(tx, id, customerId, reason.trim(), 'CUSTOMER');
      return tx.shopOrder.findUniqueOrThrow({
        where: { id },
        include: SELLER_INCLUDE,
      });
    });
    await this.notifyParty(id, 'seller', 'Khách hàng đã hủy đơn', reason);
    return result;
  }
  async setShipping(ownerId: string, id: string, dto: ShippingDto) {
    const changed = await this.prisma.shopOrder.updateMany({
      where: {
        id,
        shop: { ownerId },
        status: { in: ['CONFIRMED', 'SHIPPING'] },
      },
      data: dto,
    });
    if (!changed.count)
      throw new BadRequestException(
        'Chỉ cập nhật vận chuyển cho đơn đã xác nhận của shop',
      );
    return this.prisma.shopOrder.findUniqueOrThrow({
      where: { id },
      include: SELLER_INCLUDE,
    });
  }
  async collectCod(ownerId: string, id: string) {
    return transact(this.prisma, async (tx) => {
      const so = await tx.shopOrder.findFirst({
        where: {
          id,
          shop: { ownerId },
          status: 'DELIVERED',
          order: { paymentMethod: 'COD' },
        },
      });
      if (!so)
        throw new NotFoundException('Không tìm thấy đơn COD đã giao của shop');
      if (Number(so.paidAmount) >= Number(so.totalAmount))
        throw new ConflictException('Đơn đã được ghi nhận thu tiền');
      await tx.shopOrder.update({
        where: { id },
        data: { paidAmount: so.totalAmount },
      });
      await tx.orderStatusHistory.create({
        data: {
          shopOrderId: id,
          status: 'DELIVERED',
          actorId: ownerId,
          note: 'Người bán xác nhận đã thu tiền COD của đơn cũ',
        },
      });
      await syncPayment(tx, so.orderId);
      return { success: true };
    });
  }
  async createReturn(customerId: string, id: string, dto: CreateReturnDto) {
    const result = await transact(this.prisma, async (tx) => {
      const so = await tx.shopOrder.findFirst({
        where: { id, order: { customerId } },
      });
      if (!so) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (
        so.status !== 'DELIVERED' ||
        !so.deliveredAt ||
        Date.now() - so.deliveredAt.getTime() > 7 * 86400000
      )
        throw new BadRequestException(
          'Chỉ yêu cầu trả hàng trong 7 ngày sau khi giao',
        );
      if (await tx.returnRequest.findUnique({ where: { shopOrderId: id } }))
        throw new ConflictException('Đơn đã có yêu cầu trả hàng');
      return tx.returnRequest.create({
        data: {
          shopOrderId: id,
          reason: dto.reason.trim(),
          evidenceUrls: dto.evidenceUrls ?? [],
        },
      });
    });
    await this.notifyParty(id, 'seller', 'Có yêu cầu trả hàng', dto.reason);
    return result;
  }
  async resolveReturn(user: AuthUser, id: string, dto: ResolveReturnDto) {
    const result = await transact(this.prisma, async (tx) => {
      const so = await tx.shopOrder.findFirst({
        where: {
          id,
          ...(user.role === Role.ADMIN ? {} : { shop: { ownerId: user.id } }),
        },
        include: { returnRequest: true },
      });
      const request = so?.returnRequest;
      if (!so || !request)
        throw new NotFoundException('Không tìm thấy yêu cầu');
      const allowed =
        request.status === 'REQUESTED'
          ? ['APPROVED', 'REJECTED']
          : request.status === 'APPROVED'
            ? ['RECEIVED']
            : request.status === 'REJECTED' && user.role === 'ADMIN'
              ? ['APPROVED']
              : [];
      if (!allowed.includes(dto.status))
        throw new ConflictException(
          'Không thể cập nhật yêu cầu sang trạng thái này',
        );
      if (dto.status === 'RECEIVED') {
        if (so.status !== 'DELIVERED')
          throw new ConflictException('Đơn đã được xử lý');
        await tx.shopOrder.update({
          where: { id },
          data: { status: 'RETURNED' },
        });
        await restoreStock(tx, id);
        await requestRefund(tx, id, 'Đã nhận hàng trả lại');
        await tx.orderStatusHistory.create({
          data: {
            shopOrderId: id,
            status: 'RETURNED',
            actorId: user.id,
            note: dto.resolution,
          },
        });
      }
      return tx.returnRequest.update({
        where: { shopOrderId: id },
        data: { status: dto.status, resolution: dto.resolution.trim() },
      });
    });
    await this.notifyParty(
      id,
      'customer',
      'Yêu cầu trả hàng được cập nhật',
      dto.resolution,
    );
    return result;
  }
  async completeRefund(id: string, reference: string) {
    return transact(this.prisma, async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id } });
      if (!refund) throw new NotFoundException('Không tìm thấy khoản hoàn');
      if (refund.status === 'COMPLETED')
        throw new ConflictException('Khoản hoàn đã được xác nhận');
      await tx.refund.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          reference: reference.trim(),
          completedAt: new Date(),
        },
      });
      await syncPayment(tx, refund.orderId);
      return { success: true };
    });
  }
  private async notifyParty(
    id: string,
    target: 'seller' | 'customer',
    title: string,
    body: string,
  ) {
    try {
      const so = await this.prisma.shopOrder.findUnique({
        where: { id },
        include: {
          shop: { select: { ownerId: true } },
          order: { select: { customerId: true } },
        },
      });
      if (so)
        await this.notify(
          target === 'seller' ? so.shop.ownerId : so.order.customerId,
          title,
          body,
          target === 'seller' ? '/seller/orders' : `/orders/${so.orderId}`,
        );
    } catch (error) {
      this.logger.error(error);
    }
  }
}
