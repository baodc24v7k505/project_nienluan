export type VoucherScope = 'PLATFORM' | 'SHOP';
export type DiscountType = 'PERCENT' | 'FIXED';
export type VoucherStatus = 'ACTIVE' | 'INACTIVE';

export interface Voucher {
  id: string;
  code: string;
  scope: VoucherScope;
  shopId: string | null;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  minOrderAmount: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startAt: string;
  endAt: string;
  status: VoucherStatus;
  createdAt: string;
}

export interface VoucherApplication {
  voucherId: string;
  code: string;
  scope: VoucherScope;
  shopId: string | null;
  discountAmount: number;
}
