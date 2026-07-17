import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { logout as logoutApi } from '../api/auth';

export function MobileBottomNav({ cartCount }: { cartCount: number }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutApi().catch(() => {});
    clearAuth();
    navigate('/');
  }

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-slate-200 bg-white py-1.5 text-[10px] text-slate-500 md:hidden">
      <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1">
        <i className="fas fa-home text-lg" />
        <span>Trang chủ</span>
      </Link>

      {user?.role === 'CUSTOMER' && (
        <>
          <Link to="/cart" className="relative flex flex-col items-center gap-0.5 px-3 py-1">
            <i className="fas fa-shopping-cart text-lg" />
            {cartCount > 0 && (
              <span className="absolute -right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] text-white">
                {cartCount}
              </span>
            )}
            <span>Giỏ hàng</span>
          </Link>
          <Link to="/orders" className="flex flex-col items-center gap-0.5 px-3 py-1">
            <i className="fas fa-receipt text-lg" />
            <span>Đơn hàng</span>
          </Link>
        </>
      )}

      {user?.role === 'SELLER' && (
        <Link to="/seller" className="flex flex-col items-center gap-0.5 px-3 py-1">
          <i className="fas fa-store text-lg" />
          <span>Kênh bán</span>
        </Link>
      )}

      {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
        <Link to="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1">
          <i className="fas fa-gauge text-lg" />
          <span>Quản trị</span>
        </Link>
      )}

      {user ? (
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-1">
          <i className="fas fa-right-from-bracket text-lg" />
          <span>Đăng xuất</span>
        </button>
      ) : (
        <Link to="/login" className="flex flex-col items-center gap-0.5 px-3 py-1">
          <i className="far fa-user text-lg" />
          <span>Đăng nhập</span>
        </Link>
      )}
    </nav>
  );
}
