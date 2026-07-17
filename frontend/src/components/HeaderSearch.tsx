import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { suggestProducts } from '../api/products';

export function HeaderSearch() {
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(timer);
  }, [value]);

  const { data: suggestions } = useQuery({
    queryKey: ['product-suggestions', debounced],
    queryFn: () => suggestProducts(debounced),
    enabled: debounced.length >= 2,
  });

  const items = debounced.length >= 2 ? (suggestions ?? []) : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goToSearch(query: string) {
    setOpen(false);
    navigate(`/?search=${encodeURIComponent(query)}`);
  }

  function goToProduct(id: string) {
    setOpen(false);
    navigate(`/product/${id}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) {
      goToProduct(items[activeIndex].id);
      return;
    }
    goToSearch(value);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1">
      <form onSubmit={handleSubmit} className="flex w-full">
        <div className="flex w-full overflow-hidden rounded-sm bg-white p-[3px] shadow-sm">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            autoComplete="off"
            className="w-full min-w-0 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex flex-shrink-0 items-center justify-center rounded-sm bg-brand px-4 text-white hover:bg-brand-dark"
          >
            <i className="fas fa-search" />
          </button>
        </div>
      </form>

      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-sm border border-slate-200 bg-white text-slate-900 shadow-lg">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => goToProduct(item.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                idx === activeIndex ? 'bg-slate-50' : ''
              }`}
            >
              <i className="fas fa-search text-xs text-slate-400" />
              <span className="line-clamp-1">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
