import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma, VoucherScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

interface CartLine {
  productId: string;
  quantity: number;
  product: { price: Prisma.Decimal | number | string; shopId: string };
}

export interface VoucherApplication {
  voucherId: string;
  code: string;
  scope: VoucherScope;
  shopId: string | null;
  discountAmount: number;
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedShopOrThrow(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  async sellerCreate(ownerId: string, dto: CreateVoucherDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    return this.create(dto, VoucherScope.SHOP, shop.id);
  }

  async sellerList(ownerId: string, query: PaginationQueryDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    return this.list({ ...query, shopId: shop.id });
  }

  async sellerUpdate(ownerId: string, id: string, dto: UpdateVoucherDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher || voucher.shopId !== shop.id) {
      throw new NotFoundException('Không tìm thấy voucher');
    }
    return this.update(id, dto);
  }

  async adminCreate(dto: CreateVoucherDto) {
    return this.create(dto, VoucherScope.PLATFORM, null);
  }

  async adminList(query: PaginationQueryDto) {
    return this.list(query);
  }

  async adminUpdate(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');
    return this.update(id, dto);
  }

  private async create(
    dto: CreateVoucherDto,
    scope: VoucherScope,
    shopId: string | null,
  ) {
    this.checkValues(dto);
    const existing = await this.prisma.voucher.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại');

    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    return this.prisma.voucher.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        scope,
        shopId,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount,
        minOrderAmount: dto.minOrderAmount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
        startAt: dto.startAt,
        endAt: dto.endAt,
      },
    });
  }

  private async update(id: string, dto: UpdateVoucherDto) {
    const existing = await this.prisma.voucher.findUniqueOrThrow({
      where: { id },
    });
    this.checkValues({ ...existing, ...dto });
    return this.prisma.voucher.update({
      where: { id },
      data: {
        ...(dto.discountType ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.maxDiscountAmount !== undefined
          ? { maxDiscountAmount: dto.maxDiscountAmount }
          : {}),
        ...(dto.minOrderAmount !== undefined
          ? { minOrderAmount: dto.minOrderAmount }
          : {}),
        ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
        ...(dto.perUserLimit !== undefined
          ? { perUserLimit: dto.perUserLimit }
          : {}),
        ...(dto.startAt ? { startAt: dto.startAt } : {}),
        ...(dto.endAt ? { endAt: dto.endAt } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  private async list(query: PaginationQueryDto & { shopId?: string }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.VoucherWhereInput = {
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.search
        ? { code: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  private computeDiscount(
    voucher: {
      discountType: DiscountType;
      discountValue: Prisma.Decimal | number | string;
      maxDiscountAmount: Prisma.Decimal | number | string | null;
    },
    baseAmount: number,
  ): number {
    if (voucher.discountType === DiscountType.FIXED) {
      return Math.min(Number(voucher.discountValue), baseAmount);
    }
    const raw = (baseAmount * Number(voucher.discountValue)) / 100;
    const capped = voucher.maxDiscountAmount
      ? Math.min(raw, Number(voucher.maxDiscountAmount))
      : raw;
    return Math.min(capped, baseAmount);
  }

  async findValidVoucher(
    code: string,
    customerId: string,
    cartItems: CartLine[],
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<VoucherApplication> {
    if (cartItems.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const voucher = await db.voucher.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!voucher || voucher.status !== 'ACTIVE') {
      throw new NotFoundException(
        'Mã voucher không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const now = new Date();
    if (now < voucher.startAt || now > voucher.endAt) {
      throw new BadRequestException('Mã voucher đã hết hạn hoặc chưa bắt đầu');
    }

    if (voucher.usageLimit !== null) {
      const usedCount = await db.voucherRedemption.count({
        where: { voucherId: voucher.id },
      });
      if (usedCount >= voucher.usageLimit) {
        throw new BadRequestException('Mã voucher đã hết lượt sử dụng');
      }
    }

    if (voucher.perUserLimit !== null) {
      const usedByUser = await db.voucherRedemption.count({
        where: { voucherId: voucher.id, userId: customerId },
      });
      if (usedByUser >= voucher.perUserLimit) {
        throw new BadRequestException('Bạn đã dùng hết lượt sử dụng mã này');
      }
    }

    let baseAmount: number;
    if (voucher.scope === VoucherScope.SHOP) {
      const shopItems = cartItems.filter(
        (item) => item.product.shopId === voucher.shopId,
      );
      if (shopItems.length === 0) {
        throw new BadRequestException(
          'Giỏ hàng không có sản phẩm của shop áp dụng mã này',
        );
      }
      baseAmount = shopItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );
    } else {
      baseAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );
    }

    if (voucher.minOrderAmount && baseAmount < Number(voucher.minOrderAmount)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(voucher.minOrderAmount).toLocaleString('vi-VN')}đ để dùng mã này`,
      );
    }

    const discountAmount = Math.round(
      this.computeDiscount(voucher, baseAmount),
    );

    return {
      voucherId: voucher.id,
      code: voucher.code,
      scope: voucher.scope,
      shopId: voucher.shopId,
      discountAmount,
    };
  }

  async listActiveForShop(shopId: string) {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [
          { scope: VoucherScope.PLATFORM },
          { scope: VoucherScope.SHOP, shopId },
        ],
      },
      orderBy: { discountValue: 'desc' },
      take: 5,
    });
  }

  async validateForCustomer(customerId: string, code: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: customerId },
      include: {
        variant: true,
        product: { select: { price: true, shopId: true } },
      },
    });
    return this.findValidVoucher(
      code,
      customerId,
      cartItems.map((i) => ({
        ...i,
        product: { ...i.product, price: i.variant.price },
      })),
    );
  }

  private checkValues(dto: {
    discountType: DiscountType;
    discountValue: unknown;
    startAt: string | Date;
    endAt: string | Date;
  }) {
    if (dto.discountType === 'PERCENT' && Number(dto.discountValue) > 100)
      throw new BadRequestException('Phần trăm giảm giá không vượt quá 100');
    if (new Date(dto.startAt) >= new Date(dto.endAt))
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
  }
}
