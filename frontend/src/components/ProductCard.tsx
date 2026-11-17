import { Link } from "react-router-dom";
import { formatVnd } from "../lib/format";
import type { Product } from "../types/product";
import { WishlistButton } from "./WishlistButton";
export function ProductCard({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  const hasRange = new Set(variants.map((v) => Number(v.price))).size > 1;
  return (
    <article className="relative min-w-0">
      <Link
        to={`/product/${product.id}`}
        className="group block overflow-hidden rounded-2xl bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50"
      >
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <img
            src={product.images[0]?.url ?? "/favicon.svg"}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/favicon.svg";
            }}
          />
          {product.stock === 0 && (
            <span className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-500">
              Tạm hết hàng
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="absolute bottom-3 left-3 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              Chỉ còn {product.stock}
            </span>
          )}
        </div>
        <div className="p-3.5 md:p-4">
          <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {product.category?.name ?? "Sản phẩm"}
          </p>
          <h3 className="line-clamp-2 min-h-10 text-[13px] font-medium leading-5 text-slate-800 group-hover:text-brand md:text-sm">
            {product.name}
          </h3>
          <p className="mt-3 text-base font-semibold tracking-tight text-slate-950 md:text-lg">
            {hasRange && (
              <span className="mr-1 text-xs font-normal text-slate-400">
                Từ
              </span>
            )}
            {formatVnd(product.price)}
          </p>
          <div className="mt-2 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
            {(product.reviewCount ?? 0) > 0 ? (
              <span className="text-amber-600">
                <i className="fas fa-star mr-1 text-[9px]" aria-hidden="true" />
                {product.ratingAverage?.toFixed(1)}{" "}
                <span className="text-slate-400">({product.reviewCount})</span>
              </span>
            ) : (
              <span>
                {variants.length > 1
                  ? `${variants.length} phân loại`
                  : "Sản phẩm mới"}
              </span>
            )}
            {(product.soldCount ?? 0) > 0 && (
              <span>· Đã bán {product.soldCount}</span>
            )}
          </div>
          <p className="mt-3 truncate text-[11px] text-slate-500">
            <i
              className="fas fa-store mr-1.5 text-slate-300"
              aria-hidden="true"
            />
            {product.shop.name}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <WishlistButton productId={product.id} compact />
      </div>
    </article>
  );
}
