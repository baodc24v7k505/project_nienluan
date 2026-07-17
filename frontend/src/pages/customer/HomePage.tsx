import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listProducts } from '../../api/products';
import { listCategories } from '../../api/categories';
import { Pagination } from '../../components/Pagination';
import { AdBanner } from '../../components/AdBanner';
import { ProductCard } from '../../components/ProductCard';

const PAGE_SIZE = 12;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, categoryId, page }],
    queryFn: () =>
      listProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  function handleCategoryClick(id: string) {
    setCategoryId(id);
    setPage(1);
  }

  function clearSearch() {
    setSearchParams({});
  }

  return (
    <div>
      <AdBanner />

      {/* Danh mục */}
      <div className="mb-6 overflow-x-auto hide-scrollbar rounded-sm bg-white p-4 shadow-sm">
        <div className="flex gap-4">
          <button
            onClick={() => handleCategoryClick('')}
            className="flex w-20 flex-shrink-0 flex-col items-center gap-2 group"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                categoryId === '' ? 'border-brand text-brand' : 'border-slate-200 text-slate-400'
              }`}
            >
              <i className="fas fa-border-all text-lg" />
            </div>
            <span
              className={`text-center text-xs leading-tight ${categoryId === '' ? 'text-brand' : 'text-slate-600'}`}
            >
              Tất cả
            </span>
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.id)}
              className="flex w-20 flex-shrink-0 flex-col items-center gap-2"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                  categoryId === c.id ? 'border-brand text-brand' : 'border-slate-200 text-slate-400'
                }`}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
              <span
                className={`text-center text-xs leading-tight ${
                  categoryId === c.id ? 'text-brand' : 'text-slate-600'
                }`}
              >
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {search && (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <span>
            Kết quả tìm kiếm cho: <span className="font-medium text-slate-900">"{search}"</span>
          </span>
          <button onClick={clearSearch} className="text-brand hover:underline">
            Xoá tìm kiếm
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">Đang tải sản phẩm...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {data?.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="mt-10 text-center text-slate-400">Không tìm thấy sản phẩm nào</p>
      )}
      {data && (
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
