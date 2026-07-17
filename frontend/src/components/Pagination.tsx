export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        Trước
      </button>
      <span className="tabular-nums text-slate-500">
        Trang {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
}
