import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { slugify } from '../common/utils/slugify';

const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  shop: { select: { id: true, name: true, status: true } },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFilterWhere(query: ListProductsQueryDto): Prisma.ProductWhereInput {
    return {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
    };
  }

  /**
   * Accent-insensitive + typo-tolerant product id lookup (backed by the
   * immutable_unaccent()/pg_trgm index), so "ao thun" still matches "Áo thun".
   */
  private async searchFilter(search?: string): Promise<Prisma.ProductWhereInput> {
    const q = search?.trim();
    if (!q) return {};

    const containsPattern = `%${q}%`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p."id"
      FROM "products" p
      WHERE immutable_unaccent(p."name") ILIKE immutable_unaccent(${containsPattern})
         OR immutable_unaccent(COALESCE(p."description", '')) ILIKE immutable_unaccent(${containsPattern})
         OR similarity(immutable_unaccent(p."name"), immutable_unaccent(${q})) > 0.2
    `);

    return { id: { in: rows.map((r) => r.id) } };
  }

  async findPublic(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ProductWhereInput = {
      ...this.buildFilterWhere(query),
      ...(await this.searchFilter(query.search)),
      status: ProductStatus.ACTIVE,
      shop: { status: ShopStatus.APPROVED },
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async suggest(rawQuery: string) {
    const q = rawQuery.trim();
    if (q.length < 2) return [];

    const prefixPattern = `${q}%`;
    const containsPattern = `%${q}%`;

    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; slug: string; score: number }[]
    >(Prisma.sql`
      SELECT p."id", p."name", p."slug", similarity(immutable_unaccent(p."name"), immutable_unaccent(${q})) AS score
      FROM "products" p
      INNER JOIN "shops" s ON s."id" = p."shopId"
      WHERE p."status" = 'ACTIVE' AND s."status" = 'APPROVED'
        AND (
          immutable_unaccent(p."name") ILIKE immutable_unaccent(${prefixPattern})
          OR immutable_unaccent(p."name") ILIKE immutable_unaccent(${containsPattern})
          OR similarity(immutable_unaccent(p."name"), immutable_unaccent(${q})) > 0.2
        )
      ORDER BY (immutable_unaccent(p."name") ILIKE immutable_unaccent(${prefixPattern})) DESC, score DESC, p."name" ASC
      LIMIT 8
    `);

    return rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));
  }

  async findPublicOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product || product.status !== ProductStatus.ACTIVE || product.shop.status !== ShopStatus.APPROVED) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  private async getOwnedShopOrThrow(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  async findMine(ownerId: string, query: ListProductsQueryDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ProductWhereInput = {
      ...this.buildFilterWhere(query),
      ...(await this.searchFilter(query.search)),
      shopId: shop.id,
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let suffix = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  async create(ownerId: string, dto: CreateProductDto) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    if (shop.status !== ShopStatus.APPROVED) {
      throw new ForbiddenException('Shop của bạn chưa được duyệt, chưa thể đăng sản phẩm');
    }

    const slug = await this.uniqueSlug(dto.name);
    const { images, ...rest } = dto;

    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        shopId: shop.id,
        status: dto.status ?? ProductStatus.ACTIVE,
        images: images?.length
          ? { create: images.map((url, index) => ({ url, sortOrder: index })) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  private async getOwnedProductOrThrow(ownerId: string, productId: string) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.shopId !== shop.id) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  async update(ownerId: string, productId: string, dto: UpdateProductDto) {
    await this.getOwnedProductOrThrow(ownerId, productId);
    const { images, ...rest } = dto;

    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...rest,
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: images.map((url, index) => ({ url, sortOrder: index })),
              },
            }
          : {}),
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(ownerId: string, productId: string) {
    await this.getOwnedProductOrThrow(ownerId, productId);
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  async adminList(query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ProductWhereInput = {
      ...this.buildFilterWhere(query),
      ...(await this.searchFilter(query.search)),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminUpdateStatus(id: string, dto: UpdateProductStatusDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: PRODUCT_INCLUDE,
    });
  }
}
