import { useState } from "react";
import { apiClient } from "../api/client";
export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="text-xs">
      <label className="inline-block cursor-pointer rounded border border-slate-300 bg-white px-3 py-2">
        {busy ? "Đang tải ảnh..." : "Tải ảnh từ máy (tối đa 2MB)"}
        <input
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            if (file.size > 2 * 1024 * 1024) {
              setError("Ảnh vượt quá 2MB");
              return;
            }
            setBusy(true);
            try {
              const form = new FormData();
              form.append("file", file);
              const { data } = await apiClient.post<{ url: string }>(
                "/media",
                form,
              );
              onUpload(data.url);
            } catch (err: any) {
              setError(err.response?.data?.message ?? "Không tải được ảnh");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {error && <p className="mt-1 text-red-600">{error}</p>}
    </div>
  );
}
