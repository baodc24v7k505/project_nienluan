import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/admin', label: 'Tổng quan', end: true },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/staff', label: 'Nhân viên' },
  { to: '/admin/shops', label: 'Shop' },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/products', label: 'Sản phẩm' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/vouchers', label: 'Voucher' },
  { to: '/admin/ads', label: 'Quảng cáo' },
  { to: '/admin/chat', label: 'Hỗ trợ' },
];

export function AdminLayout() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Trang quản trị</h1>
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'border-b-2 border-slate-900 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
