import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const STATUS_LABEL_VI: Record<AdStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã được duyệt',
  REJECTED: 'Đã bị từ chối',
  EXPIRED: 'Đã hết hạn',
};

@Injectable()
export class AdvertisementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getOwnedShopOrThrow(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  async sellerCreate(ownerId: string, dto: CreateAdDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    if (shop.status !== ShopStatus.APPROVED) {
      throw new BadRequestException('Shop của bạn chưa được duyệt, chưa thể chạy quảng cáo');
    }
    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
    }

    return this.prisma.advertisement.create({
      data: {
        shopId: shop.id,
        title: dto.title,
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        startAt: dto.startAt,
        endAt: dto.endAt,
      },
    });
  }

  async sellerList(ownerId: string, query: PaginationQueryDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { shopId: shop.id };

    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminList(query: PaginationQueryDto & { status?: AdStatus }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { ...(query.status ? { status: query.status } : {}) };

    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        include: { shop: { select: { id: true, name: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminUpdateStatus(id: string, dto: UpdateAdStatusDto) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: { shop: true },
    });
    if (!ad) throw new NotFoundException('Không tìm thấy quảng cáo');

    const updated = await this.prisma.advertisement.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.notificationsService.create({
      userId: ad.shop.ownerId,
      type: 'AD_STATUS_CHANGED',
      title: 'Quảng cáo của bạn có cập nhật',
      body: `"${ad.title}": ${STATUS_LABEL_VI[dto.status]}`,
      link: '/seller/ads',
    });

    return updated;
  }

  async getActive() {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: { status: AdStatus.APPROVED, startAt: { lte: now }, endAt: { gte: now } },
      include: { shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
