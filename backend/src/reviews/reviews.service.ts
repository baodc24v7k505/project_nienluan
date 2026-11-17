import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ShopOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateReviewDto) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: { shopOrder: { include: { order: true } } },
    });

    if (!orderItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }
    if (orderItem.shopOrder.order.customerId !== customerId) {
      throw new ForbiddenException('Bạn không có quyền đánh giá sản phẩm này');
    }
    if (orderItem.shopOrder.status !== ShopOrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá sau khi đơn hàng đã được giao',
      );
    }

    const existing = await this.prisma.review.findUnique({
      where: { orderItemId: dto.orderItemId },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');
    }

    const imageIds = dto.imageIds ?? [];
    if (
      imageIds.length &&
      (await this.prisma.mediaAsset.count({
        where: { id: { in: imageIds }, ownerId: customerId },
      })) !== imageIds.length
    ) {
      throw new BadRequestException(
        'Chỉ được sử dụng ảnh do chính bạn tải lên',
      );
    }
    try {
      return await this.prisma.review.create({
        data: {
          productId: orderItem.productId,
          customerId,
          orderItemId: dto.orderItemId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          images: {
            create: imageIds.map((assetId, sortOrder) => ({
              assetId,
              sortOrder,
            })),
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');
      }
      throw error;
    }
  }

  async findByProduct(
    productId: string,
    query: ListReviewsQueryDto,
    apiUrl: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE', shop: { status: 'APPROVED' } },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReviewWhereInput = {
      productId,
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.withImages === 'true' ? { images: { some: {} } } : {}),
    };

    const [items, total, groups, withImages] = await Promise.all([
      this.prisma.review.findMany({
        where,
        select: {
          id: true,
          productId: true,
          rating: true,
          comment: true,
          createdAt: true,
          customer: { select: { fullName: true } },
          orderItem: { select: { variantSnapshot: true } },
          images: { select: { assetId: true }, orderBy: { sortOrder: 'asc' } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [
          { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
          { id: 'desc' },
        ],
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { _all: true },
      }),
      this.prisma.review.count({ where: { productId, images: { some: {} } } }),
    ]);
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: groups.find((g) => g.rating === rating)?._count._all ?? 0,
    }));
    const reviewCount = distribution.reduce((sum, g) => sum + g.count, 0);
    const avgRating = reviewCount
      ? distribution.reduce((sum, g) => sum + g.rating * g.count, 0) /
        reviewCount
      : 0;

    return {
      items: items.map(({ images, orderItem, ...item }) => ({
        ...item,
        variantName: orderItem.variantSnapshot,
        imageUrls: images.map(
          (image) => `${apiUrl.replace(/\/$/, '')}/media/${image.assetId}`,
        ),
      })),
      total,
      page,
      pageSize,
      avgRating,
      summary: { total: reviewCount, avgRating, withImages, distribution },
    };
  }
}
