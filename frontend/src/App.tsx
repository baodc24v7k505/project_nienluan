import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthBootstrap } from './auth/AuthBootstrap';
import { RequireAuth } from './auth/RequireAuth';
import { RootLayout } from './layouts/RootLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { SellerLayout } from './layouts/SellerLayout';
import { HomePage } from './pages/customer/HomePage';
import { ProductDetailPage } from './pages/customer/ProductDetailPage';
import { ShopPage } from './pages/customer/ShopPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { OrderDetailPage } from './pages/customer/OrderDetailPage';
import { PaymentMomoReturnPage } from './pages/customer/PaymentMomoReturnPage';
import { ChatPage } from './pages/chat/ChatPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { SellerShopPage } from './pages/seller/SellerShopPage';
import { SellerProductsPage } from './pages/seller/SellerProductsPage';
import { SellerOrdersPage } from './pages/seller/SellerOrdersPage';
import { SellerStatisticsPage } from './pages/seller/SellerStatisticsPage';
import { SellerVouchersPage } from './pages/seller/SellerVouchersPage';
import { SellerAdsPage } from './pages/seller/SellerAdsPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminStaffPage } from './pages/admin/AdminStaffPage';
import { AdminShopsPage } from './pages/admin/AdminShopsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminVouchersPage } from './pages/admin/AdminVouchersPage';
import { AdminAdsPage } from './pages/admin/AdminAdsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<HomePage />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
              <Route path="shop/:id" element={<ShopPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route
                path="cart"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <CartPage />
                  </RequireAuth>
                }
              />
              <Route
                path="checkout"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="orders"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <OrdersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <OrderDetailPage />
                  </RequireAuth>
                }
              />
              <Route path="payment/momo/return" element={<PaymentMomoReturnPage />} />
              <Route
                path="chat"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <ChatPage />
                  </RequireAuth>
                }
              />
              <Route
                path="seller"
                element={
                  <RequireAuth roles={['SELLER']}>
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
                  <RequireAuth roles={['ADMIN', 'STAFF']}>
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="staff" element={<AdminStaffPage />} />
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
        </AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
