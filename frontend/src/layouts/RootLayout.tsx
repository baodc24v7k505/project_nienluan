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
  const user = useAuthStore((s) => s.user),
    clearAuth = useAuthStore((s) => s.clearAuth),
    navigate = useNavigate();
  useRealtimeConnection();
  const { data: cart } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: user?.role === "CUSTOMER",
  });
  const cartCount = cart?.items.length ?? 0;
  const chatLink =
    user?.role === "SELLER"
      ? "/seller/chat"
      : user?.role === "CUSTOMER"
        ? "/chat"
        : "/admin/chat";
  async function logout() {
    await logoutApi().catch(() => {});
    clearAuth();
    navigate("/");
  }
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <header className="sticky top-0 z-40 bg-white shadow-[0_2px_14px_rgb(15_23_42/4%)]">
        <div className="hidden bg-[#f0f2f5] md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2 text-[11px] text-slate-500">
            <span>Khám phá nhiều gian hàng. Mua sắm thuận tiện.</span>
            <div className="flex items-center gap-5">
              {user?.role === "SELLER" && (
                <Link to="/seller" className="hover:text-brand">
                  Kênh người bán
                </Link>
              )}
              {(user?.role === "ADMIN" || user?.role === "STAFF") && (
                <Link to="/admin" className="hover:text-brand">
                  Quản trị
                </Link>
              )}
              {user?.role === "CUSTOMER" && (
                <Link to="/orders" className="hover:text-brand">
                  Đơn hàng của tôi
                </Link>
              )}
              {user ? (
                <>
                  <Link to="/account" className="font-medium text-slate-700">
                    Tài khoản: {user.fullName}
                  </Link>
                  <button onClick={logout} className="hover:text-brand">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/register">Đăng ký</Link>
                  <Link to="/login" className="font-semibold text-slate-700">
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 md:flex-nowrap md:gap-10 md:px-6 md:py-5">
          <Link
            to="/"
            aria-label="Sàn TMĐT - Trang chủ"
            className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 md:text-xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base text-white">
              <i className="fas fa-store" aria-hidden="true" />
            </span>
            Sàn TMĐT
          </Link>
          <div className="order-last w-full md:order-none md:flex-1">
            <HeaderSearch />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-4 text-lg text-slate-600">
            {user?.role === "CUSTOMER" && (
              <Link
                to="/wishlist"
                aria-label="Sản phẩm yêu thích"
                className="hover:text-rose-500"
              >
                <i className="far fa-heart" aria-hidden="true" />
              </Link>
            )}
            {user ? (
              <>
                <Link
                  to={chatLink}
                  aria-label="Tin nhắn"
                  className="hover:text-brand"
                >
                  <i className="far fa-comment-dots" aria-hidden="true" />
                </Link>
                <NotificationBell />
                <Link
                  to="/account"
                  aria-label={`Tài khoản: ${user.fullName}`}
                  className="text-base md:hidden"
                >
                  <i className="far fa-user" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <Link to="/login" aria-label="Đăng nhập" className="md:hidden">
                <i className="far fa-user" aria-hidden="true" />
              </Link>
            )}
            {user?.role === "CUSTOMER" && (
              <Link
                to="/cart"
                aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
                className="relative hover:text-brand"
              >
                <i className="fas fa-bag-shopping" aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
      <footer className="mt-10 hidden bg-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7 text-xs text-slate-400">
          <span className="font-semibold text-slate-600">
            <i className="fas fa-store mr-2 text-brand" aria-hidden="true" />
            Sàn TMĐT
          </span>
          <span>© 2026 · Hệ thống thương mại điện tử đa gian hàng</span>
          <Link to={user ? chatLink : "/login"} className="hover:text-brand">
            Trung tâm hỗ trợ
          </Link>
        </div>
      </footer>
      <FloatingChatButton />
      <MobileBottomNav cartCount={cartCount} />
    </div>
  );
}
