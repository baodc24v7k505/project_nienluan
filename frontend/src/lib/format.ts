export function formatVnd(value: string | number): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatVoucherDiscount(voucher: {
  discountType: 'PERCENT' | 'FIXED';
  discountValue: string | number;
}): string {
  return voucher.discountType === 'PERCENT'
    ? `Giảm ${voucher.discountValue}%`
    : `Giảm ${formatVnd(voucher.discountValue)}`;
}
