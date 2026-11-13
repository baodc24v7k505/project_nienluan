import { WorkspaceLayout } from "./WorkspaceLayout";
export function SellerLayout() {
  return (
    <WorkspaceLayout
      title="Kênh người bán"
      caption="Quản lý gian hàng"
      tabs={[
        { to: "/seller", label: "Shop của tôi", icon: "fa-store", end: true },
        { to: "/seller/products", label: "Sản phẩm", icon: "fa-cubes" },
        { to: "/seller/orders", label: "Đơn hàng", icon: "fa-box" },
        {
          to: "/seller/statistics",
          label: "Thống kê",
          icon: "fa-chart-simple",
        },
        { to: "/seller/vouchers", label: "Mã giảm giá", icon: "fa-ticket" },
        { to: "/seller/ads", label: "Quảng cáo", icon: "fa-bullhorn" },
        { to: "/seller/chat", label: "Tin nhắn", icon: "fa-comments" },
      ]}
    />
  );
}
