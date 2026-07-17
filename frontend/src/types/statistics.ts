export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface VoucherStat {
  voucherId: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  status: 'ACTIVE' | 'INACTIVE';
  usedCount: number;
  usageLimit: number | null;
  totalDiscount: number;
}

export interface SellerStatistics {
  totalRevenue: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: RevenuePoint[];
  topProducts: { productId: string; name: string; quantitySold: number; revenue: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  voucherStats: VoucherStat[];
}

export interface AdminStatistics {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalShops: number;
  shopsByStatus: Record<string, number>;
  totalOrders: number;
  totalRevenue: number;
  revenueByDay: RevenuePoint[];
  topShops: { shopId: string; name: string; revenue: number }[];
  voucherStats: VoucherStat[];
}
