import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, ShopOrderStatus, VoucherScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_REVENUE_DAYS = 14;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildEmptyRevenueByDay(days: number): Map<string, number> {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(dateKey(d), 0);
  }
  return map;
}

function clampDays(days?: number): number {
  if (!days || Number.isNaN(days)) return DEFAULT_REVENUE_DAYS;
  return Math.min(90, Math.max(7, days));
}

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedShopOrThrow(ownerId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return shop;
  }

  private async getVoucherStats(scope: VoucherScope, shopId?: string) {
    const vouchers = await this.prisma.voucher.findMany({
      where: { scope, ...(shopId ? { shopId } : {}) },
      include: { redemptions: { select: { amount: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => ({
      voucherId: v.id,
      code: v.code,
      discountType: v.discountType,
      status: v.status,
      usedCount: v.redemptions.length,
      usageLimit: v.usageLimit,
      totalDiscount: v.redemptions.reduce((sum, r) => sum + Number(r.amount), 0),
    }));
  }

  async getSellerStatistics(ownerId: string, days?: number) {
    const shop = await this.getOwnedShopOrThrow(ownerId);
    const revenueDays = clampDays(days);

    const [statusCounts, deliveredOrders, orderItems, voucherStats] = await Promise.all([
      this.prisma.shopOrder.groupBy({
        by: ['status'],
        where: { shopId: shop.id },
        _count: { _all: true },
      }),
      this.prisma.shopOrder.findMany({
        where: { shopId: shop.id, status: ShopOrderStatus.DELIVERED },
        select: { subtotal: true, updatedAt: true },
      }),
      this.prisma.orderItem.findMany({
        where: { shopOrder: { shopId: shop.id, status: ShopOrderStatus.DELIVERED } },
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          product: { select: { name: true, category: { select: { name: true } } } },
        },
      }),
      this.getVoucherStats(VoucherScope.SHOP, shop.id),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const status of Object.values(ShopOrderStatus)) ordersByStatus[status] = 0;
    for (const row of statusCounts) ordersByStatus[row.status] = row._count._all;

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    const revenueMap = buildEmptyRevenueByDay(revenueDays);
    for (const o of deliveredOrders) {
      const key = dateKey(o.updatedAt);
      if (revenueMap.has(key)) {
        revenueMap.set(key, revenueMap.get(key)! + Number(o.subtotal));
      }
    }
    const revenueByDay = Array.from(revenueMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const productMap = new Map<string, { name: string; quantitySold: number; revenue: number }>();
    const categoryMap = new Map<string, number>();
    for (const item of orderItems) {
      const entry = productMap.get(item.productId) ?? {
        name: item.product.name,
        quantitySold: 0,
        revenue: 0,
      };
      const lineRevenue = Number(item.unitPrice) * item.quantity;
      entry.quantitySold += item.quantity;
      entry.revenue += lineRevenue;
      productMap.set(item.productId, entry);

      const categoryName = item.product.category?.name ?? 'Chưa phân loại';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + lineRevenue);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueByCategory = Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalOrders = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

    return {
      totalRevenue,
      totalOrders,
      ordersByStatus,
      revenueByDay,
      topProducts,
      revenueByCategory,
      voucherStats,
    };
  }

  async getAdminStatistics(days?: number) {
    const revenueDays = clampDays(days);

    const [userCounts, shopCounts, totalOrders, deliveredOrders, voucherStats] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.shop.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.count(),
      this.prisma.shopOrder.findMany({
        where: { status: ShopOrderStatus.DELIVERED },
        select: { subtotal: true, updatedAt: true, shopId: true, shop: { select: { name: true } } },
      }),
      this.getVoucherStats(VoucherScope.PLATFORM),
    ]);

    const usersByRole: Record<string, number> = {};
    for (const role of Object.values(Role)) usersByRole[role] = 0;
    for (const row of userCounts) usersByRole[row.role] = row._count._all;

    const shopsByStatus: Record<string, number> = {};
    for (const row of shopCounts) shopsByStatus[row.status] = row._count._all;

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    const revenueMap = buildEmptyRevenueByDay(revenueDays);
    for (const o of deliveredOrders) {
      const key = dateKey(o.updatedAt);
      if (revenueMap.has(key)) {
        revenueMap.set(key, revenueMap.get(key)! + Number(o.subtotal));
      }
    }
    const revenueByDay = Array.from(revenueMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const shopMap = new Map<string, { name: string; revenue: number }>();
    for (const o of deliveredOrders) {
      const entry = shopMap.get(o.shopId) ?? { name: o.shop.name, revenue: 0 };
      entry.revenue += Number(o.subtotal);
      shopMap.set(o.shopId, entry);
    }
    const topShops = Array.from(shopMap.entries())
      .map(([shopId, v]) => ({ shopId, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalUsers: userCounts.reduce((sum, row) => sum + row._count._all, 0),
      usersByRole,
      totalShops: shopCounts.reduce((sum, row) => sum + row._count._all, 0),
      shopsByStatus,
      totalOrders,
      totalRevenue,
      revenueByDay,
      topShops,
      voucherStats,
    };
  }
}
