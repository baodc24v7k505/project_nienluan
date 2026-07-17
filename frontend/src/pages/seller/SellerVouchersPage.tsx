import { VoucherManager } from '../../components/VoucherManager';
import { createSellerVoucher, listSellerVouchers, updateSellerVoucher } from '../../api/vouchers';

export function SellerVouchersPage() {
  return (
    <VoucherManager
      title="Tạo voucher cho shop"
      queryKey="seller-vouchers"
      listFn={listSellerVouchers}
      createFn={createSellerVoucher}
      updateFn={updateSellerVoucher}
    />
  );
}
