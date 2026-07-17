import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ShopOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

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
      throw new BadRequestException('Chỉ có thể đánh giá sau khi đơn hàng đã được giao');
    }

    const existing = await this.prisma.review.findUnique({
      where: { orderItemId: dto.orderItemId },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này rồi');
    }

    return this.prisma.review.create({
      data: {
        productId: orderItem.productId,
        customerId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async findByProduct(productId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { productId };

    const [items, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { customer: { select: { id: true, fullName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      avgRating: aggregate._avg.rating ?? 0,
    };
  }
}
