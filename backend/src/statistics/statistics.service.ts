import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticsQueryDto } from './statistics-query.dto';

export function localDay(d: Date) {
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function statisticsRange(q: StatisticsQueryDto) {
  const today = localDay(new Date());
  const to = q.to?.slice(0, 10) ?? today;
  const end = new Date(`${to}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  const from =
    q.from?.slice(0, 10) ??
    localDay(new Date(end.getTime() - (q.days ?? 14) * 86400000));
  const start = new Date(`${from}T00:00:00+07:00`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end ||
    end.getTime() - start.getTime() > 366 * 86400000
  )
    throw new BadRequestException('Khoảng thống kê phải từ 1 đến 366 ngày');
  return { from, to, start, end };
}
@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}
  private async sales(q: StatisticsQueryDto, shopId?: string) {
    const range = statisticsRange(q),
      within = (d: Date | null) => !!d && d >= range.start && d < range.end;
    const where = shopId ? { shopId } : {};
    const [orders, refunds, voucherRows] = await Promise.all([
      this.prisma.shopOrder.findMany({
        where: {
          ...where,
          OR: [
            { createdAt: { gte: range.start, lt: range.end } },
            { deliveredAt: { gte: range.start, lt: range.end } },
            {
              order: {
                payment: { paidAt: { gte: range.start, lt: range.end } },
              },
            },
          ],
        },
        include: {
          shop: true,
          order: { include: { payment: true } },
          orderItems: { include: { product: { include: { category: true } } } },
        },
      }),
      this.prisma.refund.findMany({
        where: {
          ...(shopId ? { shopOrder: { shopId } } : {}),
          OR: [
            { completedAt: { gte: range.start, lt: range.end } },
            { status: 'PENDING' },
            {
              shopOrderId: null,
              createdAt: { gte: range.start, lt: range.end },
            },
          ],
        },
      }),
      this.prisma.voucher.findMany({
        where: shopId ? { shopId } : { scope: 'PLATFORM' },
        include: {
          redemptions: {
            where: { createdAt: { gte: range.start, lt: range.end } },
            select: { amount: true },
          },
        },
      }),
    ]);
    const dayMap = new Map<string, number>();
    for (
      let ms = range.start.getTime();
      ms < range.end.getTime();
      ms += 86400000
    )
      dayMap.set(localDay(new Date(ms)), 0);
    const ordersByStatus: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNED: 0,
    };
    const products = new Map<
      string,
      { name: string; quantitySold: number; revenue: number }
    >();
    const categories = new Map<string, number>(),
      shops = new Map<string, { name: string; revenue: number }>();
    let totalCollected = 0,
      grossMerchandiseValue = 0;
    for (const so of orders) {
      if (within(so.createdAt)) ordersByStatus[so.status]++;
      const collectedAt =
        so.order.paymentMethod === 'COD'
          ? so.deliveredAt
          : (so.order.payment?.paidAt ?? null);
      if (within(collectedAt)) {
        const amount = Number(so.paidAmount);
        totalCollected += amount;
        const day = localDay(collectedAt!);
        dayMap.set(day, (dayMap.get(day) ?? 0) + amount);
        const shop = shops.get(so.shopId) ?? { name: so.shop.name, revenue: 0 };
        shop.revenue += amount;
        shops.set(so.shopId, shop);
      }
      if (
        within(so.deliveredAt) &&
        ['DELIVERED', 'RETURNED'].includes(so.status)
      ) {
        grossMerchandiseValue += Number(so.subtotal);
        for (const i of so.orderItems) {
          const product = products.get(i.productId) ?? {
            name: i.nameSnapshot,
            quantitySold: 0,
            revenue: 0,
          };
          product.quantitySold += i.quantity;
          product.revenue += Number(i.unitPrice) * i.quantity;
          products.set(i.productId, product);
          const cat = i.product.category?.name ?? 'Chưa phân loại';
          categories.set(
            cat,
            (categories.get(cat) ?? 0) + Number(i.unitPrice) * i.quantity,
          );
        }
      }
    }
    // Unassigned refunds are duplicate MoMo charges, received by the platform.
    // Include that extra cash when it was detected, before subtracting its refund.
    for (const r of refunds.filter(
      (r) => !r.shopOrderId && within(r.createdAt),
    )) {
      totalCollected += Number(r.amount);
      const day = localDay(r.createdAt);
      dayMap.set(day, (dayMap.get(day) ?? 0) + Number(r.amount));
    }
    const completed = refunds.filter(
      (r) => r.status === 'COMPLETED' && within(r.completedAt),
    );
    const totalRefunded = completed.reduce((s, r) => s + Number(r.amount), 0);
    for (const r of completed) {
      const day = localDay(r.completedAt!);
      dayMap.set(day, (dayMap.get(day) ?? 0) - Number(r.amount));
    }
    return {
      range: { from: range.from, to: range.to },
      totalCollected,
      totalRefunded,
      totalRevenue: totalCollected - totalRefunded,
      grossMerchandiseValue,
      pendingRefunds: refunds
        .filter((r) => r.status === 'PENDING')
        .reduce((s, r) => s + Number(r.amount), 0),
      totalOrders: Object.values(ordersByStatus).reduce((s, x) => s + x, 0),
      ordersByStatus,
      revenueByDay: [...dayMap].map(([date, revenue]) => ({ date, revenue })),
      topProducts: [...products]
        .map(([productId, value]) => ({ productId, ...value }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topShops: [...shops]
        .map(([shopId, value]) => ({ shopId, ...value }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      revenueByCategory: [...categories]
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      voucherStats: voucherRows.map((v) => ({
        voucherId: v.id,
        code: v.code,
        discountType: v.discountType,
        status: v.status,
        usageLimit: v.usageLimit,
        usedCount: v.redemptions.length,
        totalDiscount: v.redemptions.reduce((s, r) => s + Number(r.amount), 0),
      })),
    };
  }
  async getSellerStatistics(ownerId: string, q: StatisticsQueryDto = {}) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (!shop) throw new NotFoundException('Bạn chưa đăng ký shop');
    return this.sales(q, shop.id);
  }
  async getAdminStatistics(q: StatisticsQueryDto = {}) {
    const [sales, users, shops] = await Promise.all([
      this.sales(q),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.shop.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      ...sales,
      totalUsers: users.reduce((s, u) => s + u._count._all, 0),
      usersByRole: Object.fromEntries(
        users.map((u) => [u.role, u._count._all]),
      ),
      totalShops: shops.reduce((s, u) => s + u._count._all, 0),
      shopsByStatus: Object.fromEntries(
        shops.map((u) => [u.status, u._count._all]),
      ),
    };
  }
}
