import { Link } from 'react-router-dom';
import { formatVnd } from '../lib/format';
import type { Product } from '../types/product';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="rounded-sm border border-transparent bg-white p-2 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
    >
      <img
        src={product.images[0]?.url ?? 'https://placehold.co/300x300?text=No+Image'}
        alt={product.name}
        className="mb-2 aspect-square w-full rounded-sm object-cover"
      />
      <p className="line-clamp-2 h-9 text-[13px] leading-tight text-slate-800">{product.name}</p>
      <p className="mt-1 text-base font-medium text-brand">{formatVnd(product.price)}</p>
      <p className="mt-1 truncate text-xs text-slate-400">{product.shop.name}</p>
    </Link>
  );
}
