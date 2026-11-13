import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus, ShopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { slugify } from '../common/utils/slugify';
import { syncProduct, transact } from '../common/commerce';

const PRODUCT_INCLUDE = {
  variants: { where: { isActive: true }, orderBy: { sku: 'asc' as const } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  shop: { select: { id: true, name: true, status: true } },
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildFilterWhere(
    query: ListProductsQueryDto,
  ): Prisma.ProductWhereInput {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    )
      throw new BadRequestException('Giá tối thiểu phải nhỏ hơn giá tối đa');
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
  private async searchFilter(
    search?: string,
  ): Promise<Prisma.ProductWhereInput> {
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
        orderBy:
          query.sort === 'price_asc'
            ? [{ price: 'asc' }, { id: 'asc' }]
            : query.sort === 'price_desc'
              ? [{ price: 'desc' }, { id: 'asc' }]
              : [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.product.count({ where }),
    ]);

    const ids = items.map((item) => item.id);
    const [ratings, sales] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['productId'],
        where: { productId: { in: ids } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { productId: { in: ids }, shopOrder: { status: 'DELIVERED' } },
        _sum: { quantity: true },
      }),
    ]);
    const ratingMap = new Map(ratings.map((row) => [row.productId, row]));
    const salesMap = new Map(
      sales.map((row) => [row.productId, row._sum.quantity ?? 0]),
    );
    return {
      items: items.map((item) => ({
        ...item,
        ratingAverage: ratingMap.get(item.id)?._avg.rating ?? 0,
        reviewCount: ratingMap.get(item.id)?._count._all ?? 0,
        soldCount: salesMap.get(item.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    };
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
    if (
      !product ||
      product.status !== ProductStatus.ACTIVE ||
      product.shop.status !== ShopStatus.APPROVED
    ) {
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
      throw new ForbiddenException(
        'Shop của bạn chưa được duyệt, chưa thể đăng sản phẩm',
      );
    }

    const slug = await this.uniqueSlug(dto.name);
    const { images, variants, ...rest } = dto;
    const rows = this.variantRows(variants, dto.price, dto.stock);

    return this.prisma.product.create({
      data: {
        ...rest,
        slug,
        shopId: shop.id,
        status: dto.status ?? ProductStatus.ACTIVE,
        price: Math.min(...rows.map((v) => v.price)),
        stock: rows.reduce((s, v) => s + v.stock, 0),
        variants: { create: rows },
        images: images?.length
          ? { create: images.map((url, index) => ({ url, sortOrder: index })) }
          : undefined,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  private async getOwnedProductOrThrow(ownerId: string, productId: string) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.shopId !== shop.id) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  async update(ownerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.getOwnedProductOrThrow(ownerId, productId);
    if (product.status === 'HIDDEN' && dto.status && dto.status !== 'HIDDEN')
      throw new ForbiddenException('Sản phẩm bị ẩn cần quản trị viên kiểm tra');
    const shop = await this.getOwnedShopOrThrow(ownerId);
    if (shop.status !== 'APPROVED')
      throw new ForbiddenException('Shop chưa được duyệt hoặc đã bị khóa');
    const { images, variants, ...rest } = dto;
    return transact(this.prisma, async (tx) => {
      if (variants) {
        const rows = this.variantRows(
          variants,
          dto.price ?? Number(product.price),
          dto.stock ?? product.stock,
        );
        for (const row of rows)
          await tx.productVariant.upsert({
            where: { productId_sku: { productId, sku: row.sku } },
            update: { ...row, isActive: true },
            create: { ...row, productId },
          });
        await tx.productVariant.updateMany({
          where: { productId, sku: { notIn: rows.map((v) => v.sku) } },
          data: { isActive: false },
        });
      } else if (dto.price !== undefined || dto.stock !== undefined) {
        const active = await tx.productVariant.findMany({
          where: { productId, isActive: true },
        });
        if (active.length === 1)
          await tx.productVariant.update({
            where: { id: active[0].id },
            data: { price: dto.price, stock: dto.stock },
          });
        else
          throw new BadRequestException(
            'Vui lòng cập nhật giá và kho trong từng phân loại',
          );
      }
      await tx.product.update({
        where: { id: productId },
        data: {
          ...rest,
          ...(images
            ? {
                images: {
                  deleteMany: {},
                  create: images.map((url, index) => ({
                    url,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: PRODUCT_INCLUDE,
      });
      await syncProduct(tx, productId);
      return tx.product.findUniqueOrThrow({
        where: { id: productId },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  async remove(ownerId: string, productId: string) {
    const product = await this.getOwnedProductOrThrow(ownerId, productId);
    if (product.status === 'HIDDEN')
      throw new ForbiddenException('Sản phẩm bị ẩn cần quản trị viên kiểm tra');
    await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'DRAFT' },
    });
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

  private variantRows(
    variants: CreateProductDto['variants'],
    price: number,
    stock: number,
  ) {
    const rows = variants?.length
      ? variants.map(({ sku, name, price, stock }) => ({
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          price,
          stock,
        }))
      : [{ sku: 'DEFAULT', name: 'Mặc định', price, stock }];
    if (
      new Set(rows.map((v) => v.sku)).size !== rows.length ||
      rows.some(
        (v) => !v.sku || !v.name || v.price < 1 || !Number.isInteger(v.price),
      )
    )
      throw new BadRequestException(
        'SKU phải duy nhất, giá là số nguyên VNĐ lớn hơn 0',
      );
    return rows;
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
