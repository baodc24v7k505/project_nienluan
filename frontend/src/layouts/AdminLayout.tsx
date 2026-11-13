import { useAuthStore } from "../store/auth.store";
import { WorkspaceLayout, type WorkspaceTab } from "./WorkspaceLayout";
const tabs: WorkspaceTab[] = [
  { to: "/admin", label: "Báo cáo tổng quan", icon: "fa-chart-pie", end: true },
  { to: "/admin/orders", label: "Đơn hàng", icon: "fa-box" },
  { to: "/admin/products", label: "Sản phẩm", icon: "fa-cubes" },
  { to: "/admin/shops", label: "Gian hàng", icon: "fa-store" },
  { to: "/admin/categories", label: "Danh mục", icon: "fa-layer-group" },
  { to: "/admin/users", label: "Người dùng", icon: "fa-users" },
  { to: "/admin/staff", label: "Nhân viên", icon: "fa-user-shield" },
  { to: "/admin/vouchers", label: "Mã giảm giá", icon: "fa-ticket" },
  { to: "/admin/ads", label: "Quảng cáo", icon: "fa-bullhorn" },
  { to: "/admin/chat", label: "Hỗ trợ", icon: "fa-headset" },
];
export function AdminLayout() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <WorkspaceLayout
      title="Quản trị sàn"
      caption="Không gian làm việc"
      tabs={tabs.filter((t) => t.to !== "/admin/staff" || role === "ADMIN")}
    />
  );
}
