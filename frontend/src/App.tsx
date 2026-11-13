import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthBootstrap } from "./auth/AuthBootstrap";
import { RequireAuth } from "./auth/RequireAuth";
import { RootLayout } from "./layouts/RootLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { SellerLayout } from "./layouts/SellerLayout";
const HomePage = lazy(() =>
  import("./pages/customer/HomePage").then((m) => ({ default: m.HomePage })),
);
const ProductDetailPage = lazy(() =>
  import("./pages/customer/ProductDetailPage").then((m) => ({
    default: m.ProductDetailPage,
  })),
);
const ShopPage = lazy(() =>
  import("./pages/customer/ShopPage").then((m) => ({ default: m.ShopPage })),
);
const CartPage = lazy(() =>
  import("./pages/customer/CartPage").then((m) => ({ default: m.CartPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/customer/CheckoutPage").then((m) => ({
    default: m.CheckoutPage,
  })),
);
const OrdersPage = lazy(() =>
  import("./pages/customer/OrdersPage").then((m) => ({
    default: m.OrdersPage,
  })),
);
const OrderDetailPage = lazy(() =>
  import("./pages/customer/OrderDetailPage").then((m) => ({
    default: m.OrderDetailPage,
  })),
);
const PaymentMomoReturnPage = lazy(() =>
  import("./pages/customer/PaymentMomoReturnPage").then((m) => ({
    default: m.PaymentMomoReturnPage,
  })),
);
const ChatPage = lazy(() =>
  import("./pages/chat/ChatPage").then((m) => ({ default: m.ChatPage })),
);
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("./pages/auth/RegisterPage").then((m) => ({
    default: m.RegisterPage,
  })),
);
const SellerShopPage = lazy(() =>
  import("./pages/seller/SellerShopPage").then((m) => ({
    default: m.SellerShopPage,
  })),
);
const SellerProductsPage = lazy(() =>
  import("./pages/seller/SellerProductsPage").then((m) => ({
    default: m.SellerProductsPage,
  })),
);
const SellerOrdersPage = lazy(() =>
  import("./pages/seller/SellerOrdersPage").then((m) => ({
    default: m.SellerOrdersPage,
  })),
);
const SellerStatisticsPage = lazy(() =>
  import("./pages/seller/SellerStatisticsPage").then((m) => ({
    default: m.SellerStatisticsPage,
  })),
);
const SellerVouchersPage = lazy(() =>
  import("./pages/seller/SellerVouchersPage").then((m) => ({
    default: m.SellerVouchersPage,
  })),
);
const SellerAdsPage = lazy(() =>
  import("./pages/seller/SellerAdsPage").then((m) => ({
    default: m.SellerAdsPage,
  })),
);
const AdminOverviewPage = lazy(() =>
  import("./pages/admin/AdminOverviewPage").then((m) => ({
    default: m.AdminOverviewPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import("./pages/admin/AdminUsersPage").then((m) => ({
    default: m.AdminUsersPage,
  })),
);
const AdminStaffPage = lazy(() =>
  import("./pages/admin/AdminStaffPage").then((m) => ({
    default: m.AdminStaffPage,
  })),
);
const AdminShopsPage = lazy(() =>
  import("./pages/admin/AdminShopsPage").then((m) => ({
    default: m.AdminShopsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import("./pages/admin/AdminCategoriesPage").then((m) => ({
    default: m.AdminCategoriesPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import("./pages/admin/AdminProductsPage").then((m) => ({
    default: m.AdminProductsPage,
  })),
);
const AdminOrdersPage = lazy(() =>
  import("./pages/admin/AdminOrdersPage").then((m) => ({
    default: m.AdminOrdersPage,
  })),
);
const AdminVouchersPage = lazy(() =>
  import("./pages/admin/AdminVouchersPage").then((m) => ({
    default: m.AdminVouchersPage,
  })),
);
const AdminAdsPage = lazy(() =>
  import("./pages/admin/AdminAdsPage").then((m) => ({
    default: m.AdminAdsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const AccountPage = lazy(() =>
  import("./pages/customer/AccountPage").then((m) => ({
    default: m.AccountPage,
  })),
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Suspense
            fallback={
              <p className="p-6 text-center text-slate-500">
                ?ang t?i trang...
              </p>
            }
          >
            <Routes>
              <Route element={<RootLayout />}>
                <Route index element={<HomePage />} />
                <Route path="product/:id" element={<ProductDetailPage />} />
                <Route path="shop/:id" element={<ShopPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route
                  path="account"
                  element={
                    <RequireAuth>
                      <AccountPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="cart"
                  element={
                    <RequireAuth roles={["CUSTOMER"]}>
                      <CartPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="checkout"
                  element={
                    <RequireAuth roles={["CUSTOMER"]}>
                      <CheckoutPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <RequireAuth roles={["CUSTOMER"]}>
                      <OrdersPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="orders/:id"
                  element={
                    <RequireAuth roles={["CUSTOMER"]}>
                      <OrderDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="payment/momo/return"
                  element={<PaymentMomoReturnPage />}
                />
                <Route
                  path="chat"
                  element={
                    <RequireAuth roles={["CUSTOMER"]}>
                      <ChatPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="seller"
                  element={
                    <RequireAuth roles={["SELLER"]}>
                      <SellerLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<SellerShopPage />} />
                  <Route path="products" element={<SellerProductsPage />} />
                  <Route path="orders" element={<SellerOrdersPage />} />
                  <Route path="statistics" element={<SellerStatisticsPage />} />
                  <Route path="vouchers" element={<SellerVouchersPage />} />
                  <Route path="ads" element={<SellerAdsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                </Route>
                <Route
                  path="admin"
                  element={
                    <RequireAuth roles={["ADMIN", "STAFF"]}>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route
                    path="staff"
                    element={
                      <RequireAuth roles={["ADMIN"]}>
                        <AdminStaffPage />
                      </RequireAuth>
                    }
                  />
                  <Route path="shops" element={<AdminShopsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="vouchers" element={<AdminVouchersPage />} />
                  <Route path="ads" element={<AdminAdsPage />} />
                  <Route path="chat" element={<ChatPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
