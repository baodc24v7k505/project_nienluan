import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export function FloatingChatButton() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  if (
    !user ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/chat")
  )
    return null;

  const to =
    user.role === "SELLER"
      ? "/seller/chat"
      : user.role === "CUSTOMER"
        ? "/chat"
        : "/admin/chat";

  return (
    <Link
      to={to}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-white shadow-lg transition hover:bg-brand-dark md:bottom-6"
    >
      <i className="fas fa-comments text-lg" />
      <span className="hidden text-sm font-medium sm:inline">Chat</span>
    </Link>
  );
}
