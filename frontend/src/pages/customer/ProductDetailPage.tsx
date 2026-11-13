import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct } from "../../api/products";
import { addToCart } from "../../api/cart";
import { listProductReviews } from "../../api/reviews";
import { getOrCreateConversation } from "../../api/chat";
import { getPublicShop, listShopVouchers } from "../../api/shops";
import { useAuthStore } from "../../store/auth.store";
import { formatVnd, formatVoucherDiscount } from "../../lib/format";
import { Pagination } from "../../components/Pagination";
export function ProductDetailPage() {
  const { id } = useParams();
  return <ProductView key={id} id={id ?? ""} />;
}
function ProductView({ id }: { id: string }) {
  const navigate = useNavigate(),
    location = useLocation(),
    qc = useQueryClient(),
    user = useAuthStore((s) => s.user);
  const [activeImage, setActiveImage] = useState(0),
    [variantId, setVariantId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [reviewPage, setReviewPage] = useState(1),
    [expanded, setExpanded] = useState(false),
    [tab, setTab] = useState<"description" | "reviews">("description");
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
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
    queryKey: ["product-reviews", id, reviewPage],
    queryFn: () => listProductReviews(id, reviewPage),
    enabled: !!id,
  });
  const variants = product?.variants ?? [],
    selected =
      variants.find((v) => v.id === variantId) ??
      (variants.length === 1 ? variants[0] : null);
  const add = useMutation({
    mutationFn: () => addToCart(id, quantity, selected?.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  const chat = useMutation({
    mutationFn: () => getOrCreateConversation("DIRECT", product!.shop.id),
    onSuccess: (conv) => navigate(`/chat?conversationId=${conv.id}`),
  });
  function act(action: () => void) {
    if (!user) navigate("/login", { state: { from: location } });
    else action();
  }
  if (isLoading)
    return (
      <div className="grid animate-pulse gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-3xl bg-slate-200" />
        <div className="space-y-5 py-6">
          {[80, 60, 90, 60].map((w, i) => (
            <div
              key={i}
              style={{ width: `${w}%` }}
              className="h-10 rounded-xl bg-slate-200"
            />
          ))}
        </div>
      </div>
    );
  if (!product || error)
    return (
      <div className="surface py-20 text-center">
        <h1 className="text-xl font-semibold">Sản phẩm không còn khả dụng</h1>
        <p className="muted mt-2">Sản phẩm có thể đã được ẩn hoặc ngừng bán.</p>
        <Link to="/" className="btn btn-primary mt-5">
          Tiếp tục khám phá
        </Link>
      </div>
    );
  const stock = selected?.stock ?? 0,
    buyer = !user || user.role === "CUSTOMER";
  const image = product.images[activeImage]?.url ?? "/favicon.svg";
  const priceValues = variants.map((v) => Number(v.price));
  const priceRange =
    priceValues.length > 1 &&
    Math.min(...priceValues) !== Math.max(...priceValues);
  return (
    <div>
      <nav
        aria-label="Điều hướng sản phẩm"
        className="mb-6 flex flex-wrap items-center gap-2 text-[11px] text-slate-400"
      >
        <Link to="/" className="hover:text-brand">
          Trang chủ
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <span>{product.category.name}</span>
            <span>/</span>
          </>
        )}
        <span className="line-clamp-1 max-w-64 text-slate-600">
          {product.name}
        </span>
      </nav>
      <section className="surface grid gap-7 p-4 md:grid-cols-[1.05fr_1fr] md:gap-10 md:p-7 lg:gap-14">
        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50">
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/favicon.svg";
              }}
            />
            <span className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-500">
              {product.category?.name ?? "Sản phẩm"}
            </span>
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-pressed={activeImage === i}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ${activeImage === i ? "ring-2 ring-brand ring-offset-2" : "opacity-60 hover:opacity-100"}`}
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
        <div className="py-1 md:py-2">
          <Link
            to={`/shop/${product.shop.id}`}
            className="text-[11px] font-medium text-slate-500 hover:text-brand"
          >
            <i
              className="fas fa-store mr-1.5 text-slate-400"
              aria-hidden="true"
            />
            {product.shop.name}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight lg:text-[30px]">
            {product.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {reviews && reviews.total > 0 ? (
              <button
                className="text-amber-600"
                onClick={() => {
                  setTab("reviews");
                  document
                    .getElementById("product-information")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <i className="fas fa-star mr-1" aria-hidden="true" />
                {reviews.avgRating.toFixed(1)}{" "}
                <span className="text-slate-400">
                  · {reviews.total} đánh giá
                </span>
              </button>
            ) : (
              <span className="text-slate-400">Chưa có đánh giá</span>
            )}
            <span
              className={`flex items-center gap-1.5 ${product.stock > 0 ? "text-emerald-600" : "text-slate-400"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              {product.stock > 0 ? "Đang có hàng" : "Tạm hết hàng"}
            </span>
          </div>
          <div className="my-6">
            <p className="text-[30px] font-semibold tracking-tight text-brand">
              {!selected && priceRange && (
                <span className="mr-2 text-sm font-normal text-slate-400">
                  Từ
                </span>
              )}
              {formatVnd(selected?.price ?? product.price)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {selected
                ? `Giá cho phân loại ${selected.name}`
                : "Chọn phân loại để xem giá và tồn kho chính xác"}
            </p>
          </div>
          {!!vouchers?.length && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {vouchers.slice(0, 2).map((v) => (
                <span
                  key={v.id}
                  className="rounded-lg bg-brand-bg px-3 py-2 text-[11px] text-brand"
                >
                  <i className="fas fa-ticket mr-1.5" aria-hidden="true" />
                  <strong>{v.code}</strong> · {formatVoucherDiscount(v)}
                </span>
              ))}
            </div>
          )}
          <div>
            <div className="mb-3 flex justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">
                Phân loại sản phẩm
              </span>
              <span className="text-slate-400">
                {selected?.name ?? `${variants.length} lựa chọn`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  aria-pressed={selected?.id === v.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                    add.reset();
                  }}
                  className={`rounded-xl px-4 py-2.5 text-xs font-medium transition ${selected?.id === v.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"} ${v.stock === 0 ? "opacity-50" : ""}`}
                >
                  {v.name}
                  {v.stock === 0 ? " · Hết hàng" : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-1">
              <button
                aria-label="Giảm số lượng"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-lg text-slate-500 disabled:opacity-30"
              >
                −
              </button>
              <input
                aria-label="Số lượng mua"
                type="number"
                min={1}
                max={stock || 1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Math.max(
                      1,
                      Math.min(stock || 1, Number(e.target.value) || 1),
                    ),
                  )
                }
                className="w-11 bg-transparent text-center text-sm font-medium"
              />
              <button
                aria-label="Tăng số lượng"
                disabled={!selected || quantity >= stock}
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                className="h-8 w-8 rounded-lg text-slate-500 disabled:opacity-30"
              >
                +
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {selected
                ? `Còn ${stock} · SKU ${selected.sku}`
                : "Vui lòng chọn phân loại"}
            </p>
          </div>
          {buyer ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="btn bg-brand-bg py-3.5 text-brand hover:bg-orange-100"
                disabled={!selected || !stock || add.isPending}
                onClick={() => act(() => add.mutate())}
              >
                <i
                  className="fas fa-bag-shopping hidden sm:inline"
                  aria-hidden="true"
                />
                {add.isPending ? "Đang thêm…" : "Thêm vào giỏ"}
              </button>
              <button
                className="btn btn-primary py-3.5"
                disabled={!selected || !stock}
                onClick={() =>
                  act(() =>
                    navigate("/checkout", {
                      state: {
                        directItem: {
                          productId: id,
                          variantId: selected!.id,
                          quantity,
                        },
                      },
                    }),
                  )
                }
              >
                Mua Ngay{" "}
                <i
                  className="fas fa-arrow-right hidden sm:inline text-xs"
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Bạn đang sử dụng tài khoản quản lý. Hãy dùng tài khoản khách hàng
              để mua sắm.
            </p>
          )}
          {add.isSuccess && (
            <p role="status" className="mt-3 text-xs text-emerald-600">
              Đã thêm vào giỏ hàng.{" "}
              <Link to="/cart" className="font-medium underline">
                Xem giỏ hàng
              </Link>
            </p>
          )}
          {(add.error || chat.error) && (
            <p role="alert" className="mt-3 text-xs text-red-600">
              {((add.error ?? chat.error) as any)?.response?.data?.message ??
                "Không thực hiện được thao tác"}
            </p>
          )}
          <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex gap-3">
              <i
                className="fas fa-truck mt-0.5 text-xs text-slate-400"
                aria-hidden="true"
              />
              <p className="text-[11px] leading-5 text-slate-500">
                Giao hàng tiêu chuẩn{" "}
                <strong className="font-medium text-slate-700">
                  30.000đ/shop
                </strong>
                . Miễn phí từ 500.000đ tiền hàng của shop.
              </p>
            </div>
            <div className="flex gap-3">
              <i
                className="fas fa-arrow-rotate-left mt-0.5 text-xs text-slate-400"
                aria-hidden="true"
              />
              <p className="text-[11px] leading-5 text-slate-500">
                Yêu cầu trả hàng trong{" "}
                <strong className="font-medium text-slate-700">
                  7 ngày sau giao
                </strong>
                , theo quy trình xét duyệt của shop.
              </p>
            </div>
          </div>
        </div>
      </section>
      {shop && (
        <section className="surface mt-6 flex flex-wrap items-center gap-4 px-5 py-5 md:px-7">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-500">
            {shop.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/shop/${shop.id}`}
              className="text-sm font-semibold hover:text-brand"
            >
              {shop.name}
            </Link>
            <p className="mt-1 text-[11px] text-slate-400">
              {shop.productCount} sản phẩm ·{" "}
              {shop.reviewCount
                ? `${shop.avgRating.toFixed(1)} ★ (${shop.reviewCount} đánh giá)`
                : "Chưa có đánh giá"}
            </p>
          </div>
          <div className="flex gap-2">
            {buyer && (
              <button
                className="btn btn-secondary text-xs"
                disabled={chat.isPending}
                onClick={() => act(() => chat.mutate())}
              >
                <i className="far fa-comments" aria-hidden="true" />
                Chat với shop
              </button>
            )}
            <Link className="btn btn-secondary text-xs" to={`/shop/${shop.id}`}>
              Xem gian hàng{" "}
              <i
                className="fas fa-arrow-up-right-from-square text-[10px]"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      )}
      <section
        id="product-information"
        className="surface mt-6 scroll-mt-40 p-5 md:p-7"
      >
        <div
          role="tablist"
          aria-label="Thông tin sản phẩm"
          className="mb-6 flex gap-6"
        >
          <button
            role="tab"
            aria-selected={tab === "description"}
            onClick={() => setTab("description")}
            className={`pb-2 text-sm font-semibold ${tab === "description" ? "text-slate-900 underline decoration-brand decoration-2 underline-offset-12" : "text-slate-400"}`}
          >
            Mô tả sản phẩm
          </button>
          <button
            role="tab"
            aria-selected={tab === "reviews"}
            onClick={() => setTab("reviews")}
            className={`pb-2 text-sm font-semibold ${tab === "reviews" ? "text-slate-900 underline decoration-brand decoration-2 underline-offset-12" : "text-slate-400"}`}
          >
            Đánh giá {reviews ? `(${reviews.total})` : ""}
          </button>
        </div>
        {tab === "description" ? (
          <div role="tabpanel">
            <p
              className={`max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-600 ${!expanded ? "line-clamp-6" : ""}`}
            >
              {product.description ||
                "Gian hàng chưa bổ sung mô tả chi tiết cho sản phẩm này."}
            </p>
            {((product.description?.length ?? 0) > 400 ||
              (product.description?.split("\n").length ?? 0) > 6) && (
              <button
                className="mt-4 text-xs font-semibold text-brand"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Thu gọn" : "Xem đầy đủ mô tả"}
              </button>
            )}
          </div>
        ) : (
          <div role="tabpanel">
            {reviews && reviews.total > 0 ? (
              <>
                <div className="mb-6 flex items-center gap-5 rounded-2xl bg-amber-50/60 p-5">
                  <span className="text-3xl font-semibold text-slate-800">
                    {reviews.avgRating.toFixed(1)}
                    <span className="text-base font-normal text-slate-400">
                      {" "}
                      / 5
                    </span>
                  </span>
                  <div>
                    <p className="text-amber-500">
                      {"★".repeat(Math.round(reviews.avgRating))}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Từ {reviews.total} lượt mua đã được đánh giá
                    </p>
                  </div>
                </div>
                <div className="space-y-5">
                  {reviews.items.map((r) => (
                    <article key={r.id} className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                        {r.customer.fullName[0]}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">
                          {r.customer.fullName}
                        </p>
                        <p className="mt-1 text-xs text-amber-500">
                          {"★".repeat(r.rating)}
                          <span className="ml-3 text-[10px] text-slate-400">
                            {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {r.comment || "Khách hàng không để lại nhận xét."}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                <Pagination
                  page={reviewPage}
                  pageSize={reviews.pageSize}
                  total={reviews.total}
                  onPageChange={setReviewPage}
                />
              </>
            ) : (
              <div className="py-8 text-center">
                <i
                  className="far fa-star text-3xl text-slate-200"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Chưa có đánh giá cho sản phẩm này
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Khách hàng có thể đánh giá sau khi nhận hàng.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
