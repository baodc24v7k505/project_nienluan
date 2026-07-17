import { VoucherManager } from '../../components/VoucherManager';
import { createAdminVoucher, listAdminVouchers, updateAdminVoucher } from '../../api/vouchers';

export function AdminVouchersPage() {
  return (
    <VoucherManager
      title="Tạo voucher toàn sàn"
      queryKey="admin-vouchers"
      listFn={listAdminVouchers}
      createFn={createAdminVoucher}
      updateFn={updateAdminVoucher}
    />
  );
}
