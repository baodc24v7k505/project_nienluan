import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSellableProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });
    if (
      !product ||
      product.status !== ProductStatus.ACTIVE ||
      product.shop.status !== ShopStatus.APPROVED
    ) {
      throw new NotFoundException('Sản phẩm không khả dụng');
    }
    return product;
  }

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: { orderBy: { sortOrder: 'asc' } }, shop: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    return { items, total };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.getSellableProduct(dto.productId);

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    const newQuantity = (existing?.quantity ?? 0) + dto.quantity;

    if (newQuantity > product.stock) {
      throw new BadRequestException(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    }

    return this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId: dto.productId } },
      update: { quantity: newQuantity },
      create: { userId, productId: dto.productId, quantity: newQuantity },
    });
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');

    const product = await this.getSellableProduct(productId);
    if (quantity > product.stock) {
      throw new BadRequestException(`Chỉ còn ${product.stock} sản phẩm trong kho`);
    }

    return this.prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
    });
  }

  async removeItem(userId: string, productId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId, productId } });
    return { success: true };
  }
}
