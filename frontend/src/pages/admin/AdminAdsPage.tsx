import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteAd,
  listAdminAds,
  rejectAdDeletion,
  updateAdStatus,
} from "../../api/ads";
import type { Advertisement, AdStatus } from "../../types/ad";
import { useAuthStore } from "../../store/auth.store";
import { Dialog } from "../../components/Dialog";
import { Pagination } from "../../components/Pagination";
import { adColors, adDate, adLabels } from "../../lib/adStatus";
export function AdminAdsPage() {
  const qc = useQueryClient(),
    admin = useAuthStore((s) => s.user?.role === "ADMIN");
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [tab, setTab] = useState<"all" | "pending" | "deletion">("all");
  const [action, setAction] = useState<{
      ad: Advertisement;
      type: "delete" | "reject";
    } | null>(null),
    [note, setNote] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-ads", { page, tab, debounced }],
    queryFn: () =>
      listAdminAds({
        page,
        search: debounced || undefined,
        status: tab === "pending" ? "PENDING" : undefined,
        deletionRequested: tab === "deletion" ? "true" : undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const { data: requests } = useQuery({
    queryKey: ["ad-deletion-count"],
    queryFn: () => listAdminAds({ deletionRequested: "true", pageSize: 1 }),
  });
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-ads"] }),
      qc.invalidateQueries({ queryKey: ["ad-deletion-count"] }),
      qc.invalidateQueries({ queryKey: ["seller-ads"] }),
      qc.invalidateQueries({ queryKey: ["active-ads"] }),
    ]);
  }
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdStatus }) =>
      updateAdStatus(id, status),
    onSuccess: refresh,
  });
  const deletion = useMutation({
    mutationFn: () =>
      action!.type === "delete"
        ? deleteAd(action!.ad.id)
        : rejectAdDeletion(action!.ad.id, note.trim()),
    onSuccess: async () => {
      setAction(null);
      setNote("");
      await refresh();
    },
  });
  function open(ad: Advertisement, type: "delete" | "reject") {
    setAction({ ad, type });
    setNote("");
    deletion.reset();
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Nội dung hiển thị trên sàn</p>
          <h2 className="page-title">Quản lý quảng cáo</h2>
          <p className="muted mt-2">
            Duyệt banner, kiểm tra lịch chạy và xử lý yêu cầu từ gian hàng.
          </p>
        </div>
        {!!requests?.total && (
          <span className="badge bg-amber-50 text-amber-700">
            <i className="far fa-clock" aria-hidden="true" />
            {requests.total} yêu cầu xóa chờ xử lý
          </span>
        )}
      </header>
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-3">
        <div className="flex gap-1">
          {(
            [
              { key: "all", label: "Tất cả" },
              { key: "pending", label: "Chờ duyệt" },
              { key: "deletion", label: "Yêu cầu xóa" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              aria-pressed={tab === t.key}
              className={`rounded-xl px-3 py-2.5 text-xs font-medium ${tab === t.key ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50"}`}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
            >
              {t.label}
              {t.key === "deletion" && !!requests?.total && (
                <span className="ml-1.5 opacity-60">{requests.total}</span>
              )}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-60">
          <i
            className="fas fa-search pointer-events-none absolute left-3.5 top-3.5 text-[11px] text-slate-400"
            aria-hidden="true"
          />
          <input
            aria-label="Tìm quảng cáo"
            placeholder="Tìm banner hoặc gian hàng…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field pl-9"
          />
        </label>
      </div>
      {mutation.error && (
        <p role="alert" className="text-sm text-red-600">
          {(mutation.error as any).response?.data?.message ??
            "Không thể cập nhật quảng cáo"}
        </p>
      )}
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="surface p-8 text-center text-sm text-red-600"
        >
          Không tải được danh sách quảng cáo. Vui lòng thử lại.
        </div>
      ) : !data?.items.length ? (
        <div className="surface py-16 text-center">
          <i
            className="fas fa-bullhorn mb-4 text-3xl text-slate-200"
            aria-hidden="true"
          />
          <h3 className="text-sm font-medium">
            {tab === "deletion"
              ? "Không có yêu cầu xóa đang chờ"
              : "Chưa có quảng cáo phù hợp"}
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            {tab === "deletion"
              ? "Các yêu cầu mới từ shop sẽ xuất hiện tại đây."
              : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
          </p>
        </div>
      ) : (
        <div
          aria-busy={isFetching}
          className="grid items-start gap-5 md:grid-cols-2"
        >
          {data.items.map((ad) => (
            <article key={ad.id} className="surface overflow-hidden">
              <div className="relative aspect-[2.8/1] bg-slate-100">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="h-full w-full object-cover"
                />
                <span
                  className={`badge absolute left-3 top-3 shadow-sm ${adColors[ad.status]}`}
                >
                  {adLabels[ad.status]}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-6">
                      {ad.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      <i className="fas fa-store mr-1.5" aria-hidden="true" />
                      {ad.shop?.name}
                    </p>
                  </div>
                  {admin && (
                    <button
                      aria-label={`Xóa quảng cáo ${ad.title}`}
                      title="Xóa quảng cáo"
                      onClick={() => open(ad, "delete")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <i className="far fa-trash-can" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                  <i className="far fa-calendar" aria-hidden="true" />
                  {adDate(ad.startAt)} — {adDate(ad.endAt)}
                </p>
                {ad.linkUrl && (
                  <a
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500"
                  >
                    Xem liên kết đích{" "}
                    <i
                      className="fas fa-arrow-up-right-from-square text-[9px]"
                      aria-hidden="true"
                    />
                  </a>
                )}
                {ad.deletionRequestedAt ? (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3.5">
                    <p className="text-xs font-semibold text-amber-800">
                      Shop yêu cầu xóa quảng cáo
                    </p>
                    <p className="mt-1.5 break-words text-xs leading-5 text-amber-800/75">
                      {ad.deletionReason}
                    </p>
                    <p className="mt-2 text-[10px] text-amber-700/50">
                      Gửi ngày {adDate(ad.deletionRequestedAt)}
                    </p>
                    {admin ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn btn-danger min-h-8 px-3 py-2 text-[11px]"
                          onClick={() => open(ad, "delete")}
                        >
                          Đồng ý xóa
                        </button>
                        <button
                          className="btn min-h-8 bg-white px-3 py-2 text-[11px] text-amber-800"
                          onClick={() => open(ad, "reject")}
                        >
                          Từ chối yêu cầu
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-[10px] text-amber-700">
                        Quản trị viên sẽ xử lý yêu cầu này.
                      </p>
                    )}
                  </div>
                ) : (
                  ad.status === "PENDING" && (
                    <div className="mt-5 flex gap-2">
                      <button
                        disabled={mutation.isPending}
                        className="btn min-h-9 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-100"
                        onClick={() =>
                          mutation.mutate({ id: ad.id, status: "APPROVED" })
                        }
                      >
                        <i
                          className="fas fa-check text-[10px]"
                          aria-hidden="true"
                        />
                        Duyệt banner
                      </button>
                      <button
                        disabled={mutation.isPending}
                        className="btn btn-secondary min-h-9 px-3 py-2 text-xs"
                        onClick={() =>
                          mutation.mutate({ id: ad.id, status: "REJECTED" })
                        }
                      >
                        Từ chối
                      </button>
                    </div>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
      {action && (
        <Dialog
          title={
            action.type === "delete" ? "Xóa quảng cáo" : "Từ chối yêu cầu xóa"
          }
          onClose={() => setAction(null)}
          busy={deletion.isPending}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              deletion.mutate();
            }}
          >
            <p className="text-sm leading-6 text-slate-500">
              {action.type === "delete"
                ? "Quảng cáo sẽ dừng hiển thị trên sàn và được gỡ khỏi danh sách quản lý."
                : "Shop sẽ nhận được phản hồi và quảng cáo giữ nguyên trạng thái hiện tại."}
            </p>
            <div className="my-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold">{action.ad.title}</p>
              <p className="mt-1 text-xs text-slate-400">
                {action.ad.shop?.name}
              </p>
            </div>
            {action.type === "reject" && (
              <label className="text-xs font-medium text-slate-500">
                Lý do từ chối
                <textarea
                  className="field mt-2 min-h-28"
                  required
                  minLength={5}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giải thích để shop biết cách xử lý…"
                />
              </label>
            )}
            {deletion.error && (
              <p role="alert" className="mt-3 text-xs text-red-600">
                {(deletion.error as any).response?.data?.message ??
                  "Thao tác chưa hoàn tất, vui lòng thử lại"}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletion.isPending}
                onClick={() => setAction(null)}
              >
                Quay lại
              </button>
              <button
                className={`btn ${action.type === "delete" ? "bg-red-600 text-white hover:bg-red-700" : "btn-primary"}`}
                disabled={deletion.isPending}
              >
                {deletion.isPending
                  ? "Đang xử lý…"
                  : action.type === "delete"
                    ? "Xác nhận xóa"
                    : "Gửi phản hồi"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
