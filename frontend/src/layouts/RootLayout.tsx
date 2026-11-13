import { Link, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { logout as logoutApi } from "../api/auth";
import { getCart } from "../api/cart";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { FloatingChatButton } from "../components/FloatingChatButton";
import { NotificationBell } from "../components/NotificationBell";
import { HeaderSearch } from "../components/HeaderSearch";
import { useRealtimeConnection } from "../realtime/useRealtimeConnection";

export function RootLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  useRealtimeConnection();

  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: user?.role === "CUSTOMER",
  });
  const cartCount = cart?.items.length ?? 0;

  async function handleLogout() {
    await logoutApi().catch(() => {});
    clearAuth();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col pb-14 md:pb-0">
      <header className="sticky top-0 z-40 bg-brand shadow-sm">
        {/* Thanh tiện ích trên cùng */}
        <div className="hidden border-b border-white/15 md:block">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 py-1.5 text-[13px] text-white/90">
            {user?.role === "SELLER" && (
              <Link to="/seller" className="hover:text-white">
                Kênh người bán
              </Link>
            )}
            {(user?.role === "ADMIN" || user?.role === "STAFF") && (
              <Link to="/admin" className="hover:text-white">
                Quản trị
              </Link>
            )}
            {user?.role === "CUSTOMER" && (
              <Link to="/orders" className="hover:text-white">
                Đơn hàng của tôi
              </Link>
            )}
            {user ? (
              <>
                <Link to="/account">Tài khoản: {user.fullName}</Link>
                <button
                  onClick={handleLogout}
                  className="font-medium hover:text-white"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/register" className="hover:text-white">
                  Đăng ký
                </Link>
                <span className="h-3 border-r border-white/40" />
                <Link to="/login" className="font-medium hover:text-white">
                  Đăng nhập
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Thanh chính: logo + tìm kiếm + giỏ hàng */}
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:gap-8 md:py-4">
          <Link
            to="/"
            className="flex flex-shrink-0 items-center gap-2 text-xl font-bold text-white md:text-2xl"
          >
            <i className="fas fa-store" />
            <span>Sàn TMĐT</span>
          </Link>

          <HeaderSearch />

          {user && (
            <div className="flex flex-shrink-0 items-center gap-4">
              <Link
                to={
                  user.role === "SELLER"
                    ? "/seller/chat"
                    : user.role === "CUSTOMER"
                      ? "/chat"
                      : "/admin/chat"
                }
                className="text-xl text-white md:text-2xl"
              >
                <i className="far fa-comment-dots" />
              </Link>
              <NotificationBell />
            </div>
          )}

          {user?.role === "CUSTOMER" && (
            <Link
              to="/cart"
              className="relative flex-shrink-0 text-2xl text-white md:text-3xl"
            >
              <i className="fas fa-shopping-cart" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-brand">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="hidden border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 md:block">
        © 2026 Sàn thương mại điện tử — Tiểu luận
      </footer>

      <FloatingChatButton />
      <MobileBottomNav cartCount={cartCount} />
    </div>
  );
}
