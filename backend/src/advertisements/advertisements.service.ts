import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AdStatus, Prisma, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdStatusDto } from './dto/update-ad-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ListAdsQueryDto } from './dto/ad-deletion.dto';
import { transact } from '../common/commerce';

const STATUS_LABEL_VI: Record<AdStatus, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã được duyệt',
  REJECTED: 'Đã bị từ chối',
  EXPIRED: 'Đã hết hạn',
};

@Injectable()
export class AdvertisementsService {
  private readonly logger = new Logger(AdvertisementsService.name);
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
      throw new BadRequestException(
        'Shop của bạn chưa được duyệt, chưa thể chạy quảng cáo',
      );
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
    const where = { shopId: shop.id, deletedAt: null };

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

  async adminList(query: ListAdsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AdvertisementWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              {
                shop: { name: { contains: query.search, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
      ...(query.deletionRequested === 'true'
        ? { deletionRequestedAt: { not: null } }
        : query.deletionRequested === 'false'
          ? { deletionRequestedAt: null }
          : {}),
    };

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
    const { ad, updated } = await transact(this.prisma, async (tx) => {
      const ad = await tx.advertisement.findUnique({
        where: { id },
        include: { shop: true },
      });
      if (!ad || ad.deletedAt)
        throw new NotFoundException('Không tìm thấy quảng cáo');
      if (ad.deletionRequestedAt)
        throw new ConflictException(
          'Cần xử lý yêu cầu xóa trước khi đổi trạng thái quảng cáo',
        );
      const updated = await tx.advertisement.update({
        where: { id },
        data: { status: dto.status },
      });
      return { ad, updated };
    });
    await this.notifyDeletion(
      ad.shop.ownerId,
      `"${ad.title}": ${STATUS_LABEL_VI[dto.status]}`,
    );
    return updated;
  }

  async getActive() {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: {
        status: AdStatus.APPROVED,
        startAt: { lte: now },
        endAt: { gte: now },
        deletedAt: null,
        shop: { status: ShopStatus.APPROVED },
      },
      include: { shop: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestDeletion(ownerId: string, id: string, reason: string) {
    if (reason.trim().length < 5)
      throw new BadRequestException('Lý do cần ít nhất 5 ký tự');
    return transact(this.prisma, async (tx) => {
      const ad = await tx.advertisement.findFirst({
        where: { id, deletedAt: null, shop: { ownerId } },
      });
      if (!ad) throw new NotFoundException('Không tìm thấy quảng cáo của shop');
      if (ad.deletionRequestedAt)
        throw new ConflictException('Yêu cầu xóa đang chờ xử lý');
      return tx.advertisement.update({
        where: { id },
        data: {
          deletionRequestedAt: new Date(),
          deletionReason: reason.trim(),
          deletionReviewNote: null,
        },
      });
    });
  }

  async cancelDeletion(ownerId: string, id: string) {
    const updated = await this.prisma.advertisement.updateMany({
      where: {
        id,
        deletedAt: null,
        shop: { ownerId },
        deletionRequestedAt: { not: null },
      },
      data: {
        deletionRequestedAt: null,
        deletionReason: null,
        deletionReviewNote: null,
      },
    });
    if (!updated.count)
      throw new NotFoundException('Không tìm thấy yêu cầu xóa đang chờ');
    return { success: true };
  }

  async rejectDeletion(id: string, note: string) {
    if (note.trim().length < 5)
      throw new BadRequestException('Phản hồi cần ít nhất 5 ký tự');
    const ad = await transact(this.prisma, async (tx) => {
      const current = await tx.advertisement.findFirst({
        where: { id, deletedAt: null, deletionRequestedAt: { not: null } },
        include: { shop: true },
      });
      if (!current)
        throw new NotFoundException('Không tìm thấy yêu cầu xóa đang chờ');
      await tx.advertisement.update({
        where: { id },
        data: { deletionRequestedAt: null, deletionReviewNote: note.trim() },
      });
      return current;
    });
    await this.notifyDeletion(
      ad.shop.ownerId,
      `Yêu cầu xóa “${ad.title}” chưa được chấp thuận: ${note.trim()}`,
    );
    return { success: true };
  }

  async adminRemove(id: string) {
    const ad = await transact(this.prisma, async (tx) => {
      const current = await tx.advertisement.findFirst({
        where: { id, deletedAt: null },
        include: { shop: true },
      });
      if (!current) throw new NotFoundException('Không tìm thấy quảng cáo');
      await tx.advertisement.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return current;
    });
    await this.notifyDeletion(
      ad.shop.ownerId,
      `Quảng cáo “${ad.title}” đã được quản trị viên xóa`,
    );
    return { success: true };
  }

  private async notifyDeletion(userId: string, body: string) {
    try {
      await this.notificationsService.create({
        userId,
        type: 'AD_STATUS_CHANGED',
        title: 'Cập nhật quảng cáo',
        body,
        link: '/seller/ads',
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
