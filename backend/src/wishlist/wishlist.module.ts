import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { transact } from '../common/commerce';

const visible = {
  status: 'ACTIVE' as const,
  shop: { status: 'APPROVED' as const },
};

@Controller('wishlist')
@Roles(Role.CUSTOMER)
class WishlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ids')
  async ids(@CurrentUser() user: AuthUser) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId: user.id },
      select: { productId: true },
    });
    return { ids: items.map((item) => item.productId) };
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 12;
    const where = { userId: user.id, product: visible };
    const [rows, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { productId: 'asc' }],
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              category: true,
              shop: { select: { id: true, name: true } },
              variants: { where: { isActive: true }, orderBy: { sku: 'asc' } },
            },
          },
        },
      }),
      this.prisma.wishlistItem.count({ where }),
    ]);
    return { items: rows.map((row) => row.product), total, page, pageSize };
  }

  @Post(':productId')
  async add(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return transact(this.prisma, async (tx) => {
      if (
        !(await tx.product.findFirst({
          where: { id: productId, ...visible },
          select: { id: true },
        }))
      ) {
        throw new NotFoundException('Sản phẩm không còn khả dụng');
      }
      const key = { userId: user.id, productId };
      if (
        await tx.wishlistItem.findUnique({ where: { userId_productId: key } })
      )
        return { saved: true };
      if (
        (await tx.wishlistItem.count({ where: { userId: user.id } })) >= 500
      ) {
        throw new BadRequestException(
          'Danh sách yêu thích tối đa 500 sản phẩm',
        );
      }
      await tx.wishlistItem.create({ data: key });
      return { saved: true };
    });
  }

  @Delete(':productId')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId },
    });
    return { saved: false };
  }
}

@Module({ controllers: [WishlistController] })
export class WishlistModule {}
