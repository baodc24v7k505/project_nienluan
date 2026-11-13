import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "../../api/products";
import { addToCart } from "../../api/cart";
import { listProductReviews } from "../../api/reviews";
import { getOrCreateConversation } from "../../api/chat";
import { getPublicShop, listShopVouchers } from "../../api/shops";
import { useAuthStore } from "../../store/auth.store";
import { formatVnd, formatVoucherDiscount } from "../../lib/format";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState("");
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id!),
    enabled: !!id,
  });

  const { data: shop } = useQuery({
    queryKey: ["shop", product?.shop.id],
    queryFn: () => getPublicShop(product!.shop.id),
    enabled: !!product,
  });

  const { data: vouchers } = useQuery({
    queryKey: ["shop-vouchers", product?.shop.id],
    queryFn: () => listShopVouchers(product!.shop.id),
    enabled: !!product,
  });

  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: () => listProductReviews(id!),
    enabled: !!id,
  });

  const addMutation = useMutation({
    mutationFn: (qty: number) =>
      addToCart(
        id!,
        qty,
        variantId ||
          (product?.variants.length === 1 ? product.variants[0].id : undefined),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const buyNowMutation = useMutation({
    mutationFn: async (qty: number) => {
      const selected =
        variantId ||
        (product?.variants.length === 1 ? product.variants[0].id : undefined);
      if (!selected) throw new Error("Vui lòng chọn phân loại");
      navigate("/checkout", {
        state: {
          directItem: { productId: id, variantId: selected, quantity: qty },
        },
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: (shopId: string) => getOrCreateConversation("DIRECT", shopId),
    onSuccess: (conv) => navigate(`/chat?conversationId=${conv.id}`),
  });

  if (isLoading) return <p className="text-slate-500">Đang tải...</p>;
  if (!product)
    return <p className="text-slate-500">Không tìm thấy sản phẩm</p>;
  const selectedVariant =
    product.variants.find((v) => v.id === variantId) ??
    (product.variants.length === 1 ? product.variants[0] : null);
  const availableStock = selectedVariant?.stock ?? 0;

  const image =
    product.images[activeImage]?.url ??
    "https://placehold.co/600x600?text=No+Image";

  function requireLogin(action: () => void) {
    if (!user) {
      navigate("/login");
      return;
    }
    action();
  }

  function changeQuantity(delta: number) {
    setQuantity((q) => Math.max(1, Math.min(availableStock, q + delta)));
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Link to="/" className="hover:text-brand">
          Trang chủ
        </Link>
        {product.category && (
          <>
            <i className="fas fa-chevron-right text-[8px]" />
            <span>{product.category.name}</span>
          </>
        )}
        <i className="fas fa-chevron-right text-[8px]" />
        <span className="line-clamp-1 text-slate-700">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-8 rounded-sm bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <img
            src={image}
            alt={product.name}
            className="w-full rounded-lg object-cover"
          />
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-md border-2 ${
                    idx === activeImage ? "border-brand" : "border-transparent"
                  }`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-medium text-slate-900">{product.name}</h1>
          {reviews && reviews.total > 0 && (
            <p className="mt-2 text-sm text-amber-600">
              ★ {reviews.avgRating.toFixed(1)}{" "}
              <span className="text-slate-500">({reviews.total} đánh giá)</span>
            </p>
          )}

          <div className="mt-4 bg-slate-50 px-4 py-3">
            <p className="text-3xl font-medium text-brand">
              {!selectedVariant && product.variants.length > 1 ? "Từ " : ""}
              {formatVnd(selectedVariant?.price ?? product.price)}
            </p>
          </div>

          {vouchers && vouchers.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-slate-500">
                Mã giảm giá của shop
              </p>
              <div className="flex flex-wrap gap-2">
                {vouchers.map((v) => (
                  <span
                    key={v.id}
                    className="rounded-sm border border-dashed border-brand bg-brand-bg px-2 py-1 text-xs text-brand"
                  >
                    {formatVoucherDiscount(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 text-sm">Phân loại sản phẩm</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                  }}
                  className={`rounded border px-3 py-2 text-sm ${selectedVariant?.id === v.id ? "border-brand bg-brand-bg text-brand" : "border-slate-200"}`}
                >
                  {v.name}
                  {v.stock === 0 ? " · Hết hàng" : ""}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            {selectedVariant
              ? `SKU ${selectedVariant.sku} · Còn ${availableStock} sản phẩm`
              : "Chọn phân loại để xem giá và tồn kho"}
          </p>

          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm text-slate-600">Số lượng</span>
            <div className="flex h-8 items-center overflow-hidden rounded-sm border border-slate-300">
              <button
                onClick={() => changeQuantity(-1)}
                className="flex h-full w-8 items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                −
              </button>
              <span className="flex h-full w-10 items-center justify-center text-sm">
                {quantity}
              </span>
              <button
                onClick={() => changeQuantity(1)}
                className="flex h-full w-8 items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>

          {(addMutation.isError || buyNowMutation.isError) && (
            <p className="mt-2 text-sm text-red-600">
              {((addMutation.error ?? buyNowMutation.error) as any)?.response
                ?.data?.message ?? "Thao tác thất bại"}
            </p>
          )}
          {addMutation.isSuccess && (
            <p className="mt-2 text-sm text-green-600">Đã thêm vào giỏ hàng</p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => requireLogin(() => addMutation.mutate(quantity))}
              disabled={
                !selectedVariant ||
                availableStock === 0 ||
                addMutation.isPending
              }
              className="flex-1 rounded-sm border border-brand bg-brand-bg py-3 text-sm font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              <i className="fas fa-cart-plus mr-2" />
              {product.stock === 0 ? "Hết hàng" : "Thêm Vào Giỏ Hàng"}
            </button>
            <button
              onClick={() =>
                requireLogin(() => buyNowMutation.mutate(quantity))
              }
              disabled={
                !selectedVariant ||
                availableStock === 0 ||
                buyNowMutation.isPending
              }
              className="flex-1 rounded-sm bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {buyNowMutation.isPending ? "Đang xử lý..." : "Mua Ngay"}
            </button>
          </div>
        </div>
      </div>

      {/* Shop info block */}
      {shop && (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-sm bg-white p-6 shadow-sm sm:flex-row">
          <Link
            to={`/shop/${shop.id}`}
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-brand"
          >
            {shop.name.charAt(0).toUpperCase()}
          </Link>
          <div className="flex-1 text-center sm:text-left">
            <Link
              to={`/shop/${shop.id}`}
              className="font-medium text-slate-900 hover:text-brand"
            >
              {shop.name}
            </Link>
            <p className="mt-1 text-xs text-slate-500">
              {shop.productCount} sản phẩm ·{" "}
              {shop.reviewCount > 0
                ? `${shop.avgRating.toFixed(1)} ★ đánh giá`
                : "Chưa có đánh giá"}
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {user?.role !== "SELLER" &&
              user?.role !== "ADMIN" &&
              user?.role !== "STAFF" && (
                <button
                  onClick={() =>
                    requireLogin(() => chatMutation.mutate(product.shop.id))
                  }
                  disabled={chatMutation.isPending}
                  className="rounded-sm border border-brand bg-brand-bg px-4 py-2 text-xs font-medium text-brand hover:bg-brand/10"
                >
                  <i className="fas fa-comments mr-1" /> Chat Ngay
                </button>
              )}
            <Link
              to={`/shop/${shop.id}`}
              className="rounded-sm border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <i className="fas fa-store mr-1" /> Xem Shop
            </Link>
          </div>
        </div>
      )}

      {product.description && (
        <div className="mt-4 rounded-sm bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-base font-medium uppercase text-slate-800">
            Mô tả sản phẩm
          </h2>
          <p className="whitespace-pre-line text-sm text-slate-700">
            {product.description}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-sm bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-base font-medium uppercase text-slate-800">
          Đánh giá sản phẩm
        </h2>
        {reviews && reviews.items.length === 0 && (
          <p className="text-sm text-slate-400">
            Chưa có đánh giá nào cho sản phẩm này
          </p>
        )}
        <div className="flex flex-col gap-3">
          {reviews?.items.map((r) => (
            <div key={r.id} className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  {r.customer.fullName}
                </span>
                <span className="text-sm text-amber-600">
                  {"★".repeat(r.rating)}
                </span>
              </div>
              {r.comment && (
                <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
