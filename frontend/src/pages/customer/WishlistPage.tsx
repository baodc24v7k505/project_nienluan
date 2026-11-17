import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listWishlist } from "../../api/wishlist";
import { useAuthStore } from "../../store/auth.store";
import { ProductCard } from "../../components/ProductCard";
import { Pagination } from "../../components/Pagination";

export function WishlistPage() {
  const [page, setPage] = useState(1),
    user = useAuthStore((s) => s.user);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wishlist", user?.id, page],
    queryFn: () => listWishlist(page),
  });
  // Removing the last item on a page returns the shopper to the previous page.
  const effectivePage =
    data && !data.items.length && page > 1 ? page - 1 : page;
  if (effectivePage !== page) setPage(effectivePage);
  return (
    <div>
      <p className="eyebrow mb-2">Góc mua sắm của bạn</p>
      <h1 className="page-title">Sản phẩm yêu thích</h1>
      <p className="muted mt-2 mb-7">
        Lưu những món bạn quan tâm để dễ dàng xem lại và chọn mua. Sản phẩm
        ngừng bán sẽ tạm ẩn khỏi danh sách.
      </p>
      {error ? (
        <div role="alert" className="surface p-8 text-center">
          <p>Chưa tải được danh sách yêu thích.</p>
          <button className="btn btn-secondary mt-4" onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      ) : isLoading ? (
        <p role="status" className="muted">
          Đang tải sản phẩm yêu thích…
        </p>
      ) : data?.items.length ? (
        <>
          <p className="mb-4 text-xs text-slate-500">
            {data.total} sản phẩm đang bán
          </p>
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="surface py-16 text-center">
          <i
            className="far fa-heart text-4xl text-rose-200"
            aria-hidden="true"
          />
          <h2 className="mt-5 text-lg font-semibold">
            Bắt đầu bộ sưu tập của bạn
          </h2>
          <p className="muted mt-2">
            Chạm vào trái tim trên sản phẩm để lưu tại đây.
          </p>
          <Link to="/" className="btn btn-primary mt-6">
            Khám phá sản phẩm
          </Link>
        </div>
      )}
    </div>
  );
}
