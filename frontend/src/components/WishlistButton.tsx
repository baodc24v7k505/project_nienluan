import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { saveWishlist, wishlistIds } from "../api/wishlist";
import { useAuthStore } from "../store/auth.store";

export function WishlistButton({
  productId,
  compact = false,
}: {
  productId: string;
  compact?: boolean;
}) {
  const user = useAuthStore((s) => s.user),
    navigate = useNavigate(),
    location = useLocation(),
    qc = useQueryClient();
  const {
    data: ids,
    isError: loadError,
    refetch,
  } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: wishlistIds,
    enabled: user?.role === "CUSTOMER",
  });
  const saved = ids?.includes(productId) ?? false;
  const mutation = useMutation({
    mutationFn: () => saveWishlist(productId, !saved),
    onSuccess: () => {
      qc.setQueryData<string[]>(["wishlist-ids", user?.id], (current) =>
        saved
          ? (current ?? []).filter((id) => id !== productId)
          : [...new Set([...(current ?? []), productId])],
      );
      qc.invalidateQueries({ queryKey: ["wishlist-ids"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
  if (user && user.role !== "CUSTOMER") return null;
  return (
    <div className={compact ? "" : "flex flex-wrap items-center gap-3"}>
      <button
        type="button"
        aria-label={
          loadError
            ? "Tải lại danh sách yêu thích"
            : saved
              ? "Bỏ yêu thích"
              : "Lưu yêu thích"
        }
        aria-pressed={saved}
        disabled={mutation.isPending || (!!user && !ids && !loadError)}
        onClick={() =>
          user
            ? loadError
              ? void refetch()
              : mutation.mutate()
            : navigate("/login", { state: { from: location } })
        }
        className={
          compact
            ? `flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm ${saved ? "text-rose-500" : "text-slate-500"} disabled:opacity-50`
            : `btn btn-secondary ${saved ? "text-rose-600" : ""}`
        }
      >
        <i className={`${saved ? "fas" : "far"} fa-heart`} aria-hidden="true" />
        {!compact &&
          (loadError
            ? "Tải lại danh sách yêu thích"
            : saved
              ? "Đã lưu yêu thích"
              : "Lưu yêu thích")}
      </button>
      {mutation.isError && (
        <span
          role="alert"
          className="block max-w-40 rounded-lg bg-white p-2 text-xs text-red-600"
        >
          Chưa lưu được. Vui lòng thử lại.
        </span>
      )}
    </div>
  );
}
