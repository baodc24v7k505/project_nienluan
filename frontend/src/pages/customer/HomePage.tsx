import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { listProducts } from "../../api/products";
import { listCategories } from "../../api/categories";
import { Pagination } from "../../components/Pagination";
import { AdBanner } from "../../components/AdBanner";
import { ProductCard } from "../../components/ProductCard";
import { categoryIcon } from "../../lib/categoryIcon";
const PAGE_SIZE = 12;
export function HomePage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawSort = params.get("sort");
  const sort =
    rawSort === "price_asc" || rawSort === "price_desc" ? rawSort : "newest";
  const min = params.get("minPrice") ?? "",
    max = params.get("maxPrice") ?? "";
  const prices = { min, max };
  const [priceDraft, setPriceDraft] = useState(prices),
    [priceError, setPriceError] = useState("");
  useEffect(() => {
    setPriceDraft({ min, max });
  }, [min, max]);
  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  }
  function setPage(value: number) {
    updateFilters({ page: value > 1 ? String(value) : "" });
  }
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["products", { search, categoryId, page, sort, prices }],
    queryFn: () =>
      listProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        page,
        pageSize: PAGE_SIZE,
        sort,
        minPrice: prices.min ? Number(prices.min) : undefined,
        maxPrice: prices.max ? Number(prices.max) : undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const categoryName = categories?.find((c) => c.id === categoryId)?.name;
  function clearFilters() {
    setPriceDraft({ min: "", max: "" });
    setPriceError("");
    setParams({});
  }
  const filtered = !!(search || categoryId || prices.min || prices.max);
  const CatalogueHeading = filtered ? "h1" : "h2";
  return (
    <div>
      {!filtered && <AdBanner />}
      <section className="mb-9" aria-label="Danh mục sản phẩm">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1.5">Mua sắm dễ dàng</p>
            <h2 className="section-title text-lg">Bạn đang tìm gì?</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            {categories?.length ?? 0} danh mục
          </span>
        </div>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            aria-label="Tất cả danh mục"
            aria-pressed={!categoryId}
            onClick={() => {
              updateFilters({ categoryId: "" });
            }}
            className={`flex w-25 shrink-0 flex-col items-center gap-3 rounded-2xl px-3 py-4 transition ${!categoryId ? "bg-brand-bg text-brand" : "bg-white text-slate-500 hover:bg-slate-100"}`}
          >
            <i className="fas fa-border-all text-xl" aria-hidden="true" />
            <span className="text-xs font-medium">Tất cả</span>
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              aria-label={c.name}
              aria-pressed={categoryId === c.id}
              onClick={() => {
                updateFilters({ categoryId: c.id });
              }}
              className={`flex w-29 shrink-0 flex-col items-center gap-3 rounded-2xl px-3 py-4 transition ${categoryId === c.id ? "bg-brand-bg text-brand" : "bg-white text-slate-500 hover:bg-slate-100"}`}
            >
              <i
                aria-hidden="true"
                className={`fas ${categoryIcon(c.name)} text-xl`}
              />
              <span className="line-clamp-1 text-xs font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      </section>
      <section id="catalog" className="scroll-mt-40">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-1.5">Dành cho bạn</p>
            <CatalogueHeading className="text-2xl font-semibold tracking-tight">
              {search
                ? `Kết quả cho “${search}”`
                : (categoryName ?? "Khám phá sản phẩm")}
            </CatalogueHeading>
            <p className="mt-1.5 text-xs text-slate-400">
              {data
                ? `${data.total} sản phẩm${categoryName ? ` trong ${categoryName}` : " từ các gian hàng"}`
                : "Đang tìm sản phẩm phù hợp"}
            </p>
          </div>
          {filtered && (
            <button
              className="text-xs font-medium text-brand"
              onClick={clearFilters}
            >
              Xóa bộ lọc <i className="fas fa-xmark ml-1" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-white px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Sắp xếp
            <select
              aria-label="Sắp xếp sản phẩm"
              value={sort}
              onChange={(e) => {
                updateFilters({ sort: e.target.value });
              }}
              className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </label>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                priceDraft.min &&
                priceDraft.max &&
                Number(priceDraft.min) > Number(priceDraft.max)
              ) {
                setPriceError("Giá từ phải nhỏ hơn hoặc bằng giá đến.");
                return;
              }
              setPriceError("");
              updateFilters({
                minPrice: priceDraft.min,
                maxPrice: priceDraft.max,
              });
            }}
          >
            <span className="text-xs text-slate-400">Khoảng giá</span>
            <input
              aria-label="Giá từ"
              type="number"
              min={0}
              value={priceDraft.min}
              onChange={(e) =>
                setPriceDraft((v) => ({ ...v, min: e.target.value }))
              }
              placeholder="Từ"
              className="w-24 rounded-lg bg-slate-50 px-3 py-2 text-xs"
            />
            <span className="text-slate-300">—</span>
            <input
              aria-label="Giá đến"
              type="number"
              min={0}
              value={priceDraft.max}
              onChange={(e) =>
                setPriceDraft((v) => ({ ...v, max: e.target.value }))
              }
              placeholder="Đến"
              className="w-24 rounded-lg bg-slate-50 px-3 py-2 text-xs"
            />
            <button className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              Lọc giá
            </button>
          </form>
          {priceError && (
            <p role="alert" className="w-full text-xs text-red-600">
              {priceError}
            </p>
          )}
          {isFetching && !isLoading && (
            <span role="status" className="ml-auto text-xs text-slate-400">
              Đang cập nhật…
            </span>
          )}
        </div>
        {error ? (
          <div role="alert" className="surface p-8 text-center">
            <p className="text-sm text-red-600">
              {(error as any).response?.data?.message ??
                "Không tải được sản phẩm"}
            </p>
            <button onClick={clearFilters} className="btn btn-secondary mt-4">
              Đặt lại bộ lọc
            </button>
          </div>
        ) : isLoading ? (
          <div
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            aria-label="Đang tải sản phẩm"
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : data?.items.length ? (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="surface py-16 text-center">
            <i
              className="fas fa-magnifying-glass mb-4 text-3xl text-slate-200"
              aria-hidden="true"
            />
            <h3 className="font-medium">Chưa tìm thấy sản phẩm</h3>
            <p className="muted mt-2">
              Thử từ khóa khác hoặc mở rộng khoảng giá.
            </p>
            <button onClick={clearFilters} className="btn btn-secondary mt-5">
              Xem tất cả sản phẩm
            </button>
          </div>
        )}
        {data && !error && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(p) => {
              setPage(p);
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        )}
      </section>
    </div>
  );
}
