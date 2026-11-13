import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAdDeletion,
  createSellerAd,
  listSellerAds,
  requestAdDeletion,
} from "../../api/ads";
import type { Advertisement } from "../../types/ad";
import { Dialog } from "../../components/Dialog";
import { ImageUpload } from "../../components/ImageUpload";
import { Pagination } from "../../components/Pagination";
import { adColors, adDate, adLabels } from "../../lib/adStatus";
export function SellerAdsPage() {
  const qc = useQueryClient(),
    formRef = useRef<HTMLFormElement>(null);
  const [page, setPage] = useState(1),
    [creating, setCreating] = useState(false),
    [imageUrl, setImageUrl] = useState(""),
    [start, setStart] = useState(""),
    [target, setTarget] = useState<Advertisement | null>(null),
    [reason, setReason] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["seller-ads", page],
    queryFn: () => listSellerAds(page),
  });
  const create = useMutation({
    mutationFn: createSellerAd,
    onSuccess: () => {
      setCreating(false);
      setImageUrl("");
      setStart("");
      setPage(1);
      qc.invalidateQueries({ queryKey: ["seller-ads"] });
    },
  });
  const request = useMutation({
    mutationFn: () => requestAdDeletion(target!.id, reason.trim()),
    onSuccess: () => {
      setTarget(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["seller-ads"] });
    },
  });
  const cancel = useMutation({
    mutationFn: cancelAdDeletion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seller-ads"] }),
  });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Giới thiệu gian hàng</p>
          <h2 className="page-title">Quảng cáo của shop</h2>
          <p className="muted mt-2">
            Tạo banner và theo dõi quá trình duyệt trên sàn.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCreating(true);
            create.reset();
          }}
        >
          <i className="fas fa-plus text-xs" aria-hidden="true" />
          Tạo quảng cáo
        </button>
      </header>
      <div className="flex items-start gap-3 rounded-2xl bg-[#edf1f6] px-5 py-4">
        <i
          className="fas fa-circle-info mt-0.5 text-sm text-slate-400"
          aria-hidden="true"
        />
        <p className="text-xs leading-5 text-slate-500">
          Banner xuất hiện khi được duyệt và trong thời gian chạy. Khi không còn
          nhu cầu, bạn có thể gửi yêu cầu xóa để quản trị viên xử lý.
        </p>
      </div>
      {cancel.error && (
        <p role="alert" className="text-sm text-red-600">
          Không thể hủy yêu cầu. Vui lòng tải lại trang.
        </p>
      )}
      {isLoading ? (
        <p className="muted py-12 text-center">Đang tải quảng cáo…</p>
      ) : error ? (
        <p
          role="alert"
          className="surface p-8 text-center text-sm text-red-600"
        >
          Không tải được quảng cáo của shop.
        </p>
      ) : !data?.items.length ? (
        <div className="surface py-16 text-center">
          <i
            className="fas fa-bullhorn mb-4 text-3xl text-slate-200"
            aria-hidden="true"
          />
          <h3 className="font-medium">Giới thiệu shop bằng banner đầu tiên</h3>
          <p className="muted mt-2">
            Chuẩn bị ảnh, nội dung và thời gian hiển thị để gửi duyệt.
          </p>
          <button
            className="btn btn-secondary mt-5"
            onClick={() => setCreating(true)}
          >
            Tạo banner mới
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-2">
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
                <h3 className="text-sm font-semibold leading-6">{ad.title}</h3>
                <p className="mt-3 text-[11px] text-slate-400">
                  <i className="far fa-calendar mr-1.5" aria-hidden="true" />
                  {adDate(ad.startAt)} — {adDate(ad.endAt)}
                </p>
                {ad.deletionRequestedAt ? (
                  <div className="mt-4 rounded-xl bg-amber-50 p-3.5">
                    <p className="text-xs font-semibold text-amber-800">
                      Yêu cầu xóa đang chờ xử lý
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-amber-800/70">
                      {ad.deletionReason}
                    </p>
                    <p className="mt-2 text-[10px] text-amber-700/60">
                      Banner vẫn tuân theo lịch hiển thị cho đến khi được xóa.
                    </p>
                    <button
                      disabled={cancel.isPending}
                      className="mt-3 text-[11px] font-semibold text-amber-800"
                      onClick={() => cancel.mutate(ad.id)}
                    >
                      Hủy yêu cầu xóa
                    </button>
                  </div>
                ) : (
                  <>
                    {ad.deletionReviewNote && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Phản hồi về yêu cầu xóa
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {ad.deletionReviewNote}
                        </p>
                      </div>
                    )}
                    <button
                      className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-red-600"
                      onClick={() => {
                        setTarget(ad);
                        setReason("");
                        request.reset();
                      }}
                    >
                      <i
                        className="far fa-trash-can text-[11px]"
                        aria-hidden="true"
                      />
                      Yêu cầu xóa
                    </button>
                  </>
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
      {target && (
        <Dialog
          title="Yêu cầu xóa quảng cáo"
          onClose={() => setTarget(null)}
          busy={request.isPending}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              request.mutate();
            }}
          >
            <p className="text-sm font-medium">{target.title}</p>
            <p className="muted mt-2">
              Cho quản trị viên biết lý do bạn muốn gỡ banner này.
            </p>
            <label className="mt-5 block text-xs font-medium text-slate-500">
              Lý do yêu cầu
              <textarea
                required
                minLength={5}
                maxLength={1000}
                className="field mt-2 min-h-28"
                placeholder="Ví dụ: chiến dịch đã kết thúc, cần thay banner…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {request.error && (
              <p role="alert" className="mt-3 text-xs text-red-600">
                {(request.error as any).response?.data?.message ??
                  "Không gửi được yêu cầu"}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTarget(null)}
                disabled={request.isPending}
              >
                Quay lại
              </button>
              <button className="btn btn-primary" disabled={request.isPending}>
                {request.isPending ? "Đang gửi…" : "Gửi yêu cầu xóa"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {creating && (
        <Dialog
          title="Tạo quảng cáo mới"
          onClose={() => setCreating(false)}
          busy={create.isPending}
        >
          <form
            ref={formRef}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              create.mutate({
                title: String(f.get("title")).trim(),
                imageUrl,
                linkUrl: String(f.get("linkUrl") || "") || undefined,
                startAt: new Date(
                  String(f.get("startAt")) + "T00:00:00",
                ).toISOString(),
                endAt: new Date(
                  String(f.get("endAt")) + "T23:59:59.999",
                ).toISOString(),
              });
            }}
          >
            <label className="block text-xs font-medium text-slate-500">
              Tiêu đề banner
              <input
                name="title"
                required
                minLength={3}
                className="field mt-2"
                placeholder="Thông điệp ngắn gọn cho chiến dịch"
              />
            </label>
            <div>
              <label className="block text-xs font-medium text-slate-500">
                Ảnh banner
                <input
                  name="imageUrl"
                  required
                  type="url"
                  className="field mt-2"
                  placeholder="https://…"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </label>
              <div className="mt-2">
                <ImageUpload onUpload={setImageUrl} />
              </div>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Xem trước banner"
                  className="mt-3 aspect-[2.8/1] w-full rounded-xl bg-slate-50 object-cover"
                />
              )}
              <p className="mt-2 text-[10px] text-slate-400">
                Ảnh ngang, nội dung rõ và ít chữ để dễ đọc trên trang chủ.
              </p>
            </div>
            <label className="block text-xs font-medium text-slate-500">
              Liên kết khi nhấn banner{" "}
              <span className="font-normal text-slate-400">
                (không bắt buộc)
              </span>
              <input
                name="linkUrl"
                type="url"
                className="field mt-2"
                placeholder="https://…"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-slate-500">
                Từ ngày
                <input
                  name="startAt"
                  required
                  type="date"
                  className="field mt-2"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                Đến hết ngày
                <input
                  name="endAt"
                  required
                  type="date"
                  min={start || undefined}
                  className="field mt-2"
                />
              </label>
            </div>
            {create.error && (
              <p role="alert" className="text-xs text-red-600">
                {(create.error as any).response?.data?.message ??
                  "Không tạo được quảng cáo"}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCreating(false)}
                disabled={create.isPending}
              >
                Quay lại
              </button>
              <button className="btn btn-primary" disabled={create.isPending}>
                {create.isPending ? "Đang gửi…" : "Gửi duyệt"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
