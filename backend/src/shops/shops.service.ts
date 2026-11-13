import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { ListShopsQueryDto } from './dto/list-shops-query.dto';

const STATUS_LABEL_VI: Record<ShopStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã được duyệt',
  REJECTED: 'Đã bị từ chối',
  SUSPENDED: 'Đã bị tạm khóa',
};

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(ownerId: string, dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (existing) {
      throw new ConflictException('Bạn đã có shop rồi');
    }
    return this.prisma.shop.create({
      data: { ownerId, ...dto },
    });
  }

  async getMine(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  async updateMine(ownerId: string, dto: UpdateShopDto) {
    await this.getMine(ownerId);
    return this.prisma.shop.update({ where: { ownerId }, data: dto });
  }

  async getPublicById(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop || shop.status !== ShopStatus.APPROVED) {
      throw new NotFoundException('Không tìm thấy shop');
    }

    const [productCount, ratingAgg] = await Promise.all([
      this.prisma.product.count({ where: { shopId: id, status: 'ACTIVE' } }),
      this.prisma.review.aggregate({
        where: { product: { shopId: id } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      ...shop,
      productCount,
      avgRating: ratingAgg._avg.rating ?? 0,
      reviewCount: ratingAgg._count.rating,
    };
  }

  async adminList(query: ListShopsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminFindOne(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Không tìm thấy shop');
    return shop;
  }

  async adminUpdateStatus(id: string, dto: UpdateShopStatusDto) {
    const shop = await this.adminFindOne(id);
    const updated = await this.prisma.shop.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.notificationsService.create({
      userId: shop.ownerId,
      type: 'SHOP_STATUS_CHANGED',
      title: 'Trạng thái shop của bạn đã thay đổi',
      body: STATUS_LABEL_VI[dto.status],
      link: '/seller',
    });

    return updated;
  }
}
