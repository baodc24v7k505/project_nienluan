import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { transact } from '../common/commerce';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}
  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        variant: true,
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            shop: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items,
      total: items.reduce(
        (s, i) => s + Number(i.variant.price) * i.quantity,
        0,
      ),
    };
  }
  async addItem(userId: string, dto: AddCartItemDto) {
    return transact(this.prisma, async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        include: { shop: true, variants: { where: { isActive: true } } },
      });
      if (
        !product ||
        product.status !== 'ACTIVE' ||
        product.shop.status !== 'APPROVED'
      )
        throw new NotFoundException('Sản phẩm không khả dụng');
      const variant = dto.variantId
        ? product.variants.find((v) => v.id === dto.variantId)
        : product.variants.length === 1
          ? product.variants[0]
          : null;
      if (!variant)
        throw new BadRequestException('Vui lòng chọn phân loại sản phẩm');
      const key = { userId, variantId: variant.id };
      const existing = await tx.cartItem.findUnique({
        where: { userId_variantId: key },
      });
      const quantity = (existing?.quantity ?? 0) + dto.quantity;
      if (quantity > variant.stock)
        throw new BadRequestException(
          `Phân loại chỉ còn ${variant.stock} sản phẩm`,
        );
      return tx.cartItem.upsert({
        where: { userId_variantId: key },
        update: { quantity },
        create: { ...key, productId: product.id, quantity },
      });
    });
  }
  async updateItem(userId: string, id: string, quantity: number) {
    return transact(this.prisma, async (tx) => {
      const item = await tx.cartItem.findFirst({
        where: { id, userId },
        include: { variant: true, product: { include: { shop: true } } },
      });
      if (!item) throw new NotFoundException('Không tìm thấy dòng giỏ hàng');
      if (
        !item.variant.isActive ||
        item.product.status !== 'ACTIVE' ||
        item.product.shop.status !== 'APPROVED'
      )
        throw new BadRequestException('Sản phẩm không còn bán');
      if (quantity > item.variant.stock)
        throw new BadRequestException(`Chỉ còn ${item.variant.stock} sản phẩm`);
      return tx.cartItem.update({ where: { id }, data: { quantity } });
    });
  }
  async removeItem(userId: string, id: string) {
    await this.prisma.cartItem.deleteMany({ where: { id, userId } });
    return { success: true };
  }
}
