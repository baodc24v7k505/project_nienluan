export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface VoucherStat {
  voucherId: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  status: "ACTIVE" | "INACTIVE";
  usedCount: number;
  usageLimit: number | null;
  totalDiscount: number;
}

export interface SellerStatistics {
  range: { from: string; to: string };
  totalCollected: number;
  totalRefunded: number;
  grossMerchandiseValue: number;
  pendingRefunds: number;
  totalRevenue: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: RevenuePoint[];
  topProducts: {
    productId: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }[];
  revenueByCategory: { category: string; revenue: number }[];
  voucherStats: VoucherStat[];
}

export interface AdminStatistics {
  range: { from: string; to: string };
  ordersByStatus: Record<string, number>;
  totalCollected: number;
  totalRefunded: number;
  grossMerchandiseValue: number;
  pendingRefunds: number;
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
