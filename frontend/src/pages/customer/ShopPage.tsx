import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getPublicShop, listShopVouchers } from '../../api/shops';
import { listProducts } from '../../api/products';
import { getOrCreateConversation } from '../../api/chat';
import { useAuthStore } from '../../store/auth.store';
import { ProductCard } from '../../components/ProductCard';
import { Pagination } from '../../components/Pagination';
import { formatVoucherDiscount } from '../../lib/format';

const PAGE_SIZE = 12;

export function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop', id],
    queryFn: () => getPublicShop(id!),
    enabled: !!id,
  });

  const { data: vouchers } = useQuery({
    queryKey: ['shop-vouchers', id],
    queryFn: () => listShopVouchers(id!),
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ['shop-products', id, page],
    queryFn: () => listProducts({ shopId: id, page, pageSize: PAGE_SIZE }),
    enabled: !!id,
  });

  const chatMutation = useMutation({
    mutationFn: () => getOrCreateConversation('DIRECT', id),
    onSuccess: (conv) => navigate(`/chat?conversationId=${conv.id}`),
  });

  function handleChat() {
    if (!user) {
      navigate('/login');
      return;
    }
    chatMutation.mutate();
  }

  if (shopLoading) return <p className="text-slate-500">Đang tải...</p>;
  if (!shop) return <p className="text-slate-500">Không tìm thấy shop</p>;

  return (
    <div>
      <div className="mb-4 rounded-sm bg-brand p-6 text-white shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-white text-2xl font-bold text-brand">
            {shop.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-semibold">{shop.name}</h1>
            {shop.description && <p className="mt-1 text-sm text-white/80">{shop.description}</p>}
          </div>
          {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && user?.role !== 'STAFF' && (
            <button
              onClick={handleChat}
              disabled={chatMutation.isPending}
              className="flex-shrink-0 rounded-sm bg-white px-5 py-2 text-sm font-medium text-brand hover:bg-white/90 disabled:opacity-50"
            >
              <i className="fas fa-comments mr-1" /> Chat Ngay
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-sm bg-white p-4 text-sm text-slate-600 shadow-sm sm:grid-cols-4">
        <div>
          Sản phẩm: <span className="font-medium text-brand">{shop.productCount}</span>
        </div>
        <div>
          Đánh giá:{' '}
          <span className="font-medium text-brand">
            {shop.reviewCount > 0 ? `${shop.avgRating.toFixed(1)} (${shop.reviewCount})` : 'Chưa có'}
          </span>
        </div>
        <div>
          Tham gia:{' '}
          <span className="font-medium text-brand">
            {new Date(shop.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        {shop.address && (
          <div className="truncate">
            Địa chỉ: <span className="font-medium text-brand">{shop.address}</span>
          </div>
        )}
      </div>

      {vouchers && vouchers.length > 0 && (
        <div className="mb-4 rounded-sm bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Mã giảm giá của shop</h2>
          <div className="flex flex-wrap gap-2">
            {vouchers.map((v) => (
              <span
                key={v.id}
                className="rounded-sm border border-dashed border-brand bg-brand-bg px-3 py-1.5 text-xs text-brand"
              >
                {formatVoucherDiscount(v)} — mã {v.code}
              </span>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Sản phẩm của shop</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products?.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products && products.items.length === 0 && (
        <p className="mt-10 text-center text-slate-400">Shop chưa có sản phẩm nào</p>
      )}
      {products && (
        <Pagination
          page={products.page}
          pageSize={products.pageSize}
          total={products.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
