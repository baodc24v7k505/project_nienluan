import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/seller", label: "Shop của tôi", end: true },
  { to: "/seller/products", label: "Sản phẩm" },
  { to: "/seller/orders", label: "Đơn hàng" },
  { to: "/seller/vouchers", label: "Voucher" },
  { to: "/seller/ads", label: "Quảng cáo" },
  { to: "/seller/statistics", label: "Thống kê" },
  { to: "/seller/chat", label: "Tin nhắn" },
];

export function SellerLayout() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">
        Kênh người bán
      </h1>
      <div className="mb-6 flex gap-2 overflow-x-auto whitespace-nowrap border-b border-slate-200">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium ${
                isActive
                  ? "border-b-2 border-slate-900 text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
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
