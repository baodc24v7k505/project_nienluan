import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
export function RelatedProducts({ product }: { product: Product }) {
  const categoryId = product.category?.id;
  const { data } = useQuery({
    queryKey: ["related-products", categoryId, product.shop.id],
    queryFn: () =>
      listProducts({
        categoryId,
        shopId: categoryId ? undefined : product.shop.id,
        pageSize: 5,
      }),
  });
  const items =
    data?.items.filter((item) => item.id !== product.id).slice(0, 4) ?? [];
  if (!items.length) return null;
  return (
    <section className="mt-10" aria-label="Sản phẩm liên quan">
      <p className="eyebrow mb-2">Tiếp tục khám phá</p>
      <h2 className="mb-5 text-xl font-semibold">
        {categoryId
          ? "Cùng danh mục, thêm lựa chọn"
          : "Sản phẩm khác từ gian hàng"}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}
