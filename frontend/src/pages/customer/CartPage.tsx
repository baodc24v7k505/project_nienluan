import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getCart, removeCartItem, updateCartItem } from "../../api/cart";
import { formatVnd } from "../../lib/format";
export function CartPage() {
  const qc = useQueryClient(),
    navigate = useNavigate();
  const [selected, setSelected] = useState<string[] | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
  });
  const update = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateCartItem(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  const remove = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
  if (isLoading) return <p>Đang tải giỏ hàng...</p>;
  if (error)
    return (
      <p className="text-red-600">Không tải được giỏ hàng. Vui lòng thử lại.</p>
    );
  if (!data?.items.length)
    return (
      <div className="py-16 text-center">
        <p>Giỏ hàng đang trống</p>
        <Link to="/" className="text-brand underline">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  const ids = (selected ?? data.items.map((i) => i.id)).filter((id) =>
    data.items.some((i) => i.id === id),
  );
  const total = data.items
    .filter((i) => ids.includes(i.id))
    .reduce((s, i) => s + Number(i.variant.price) * i.quantity, 0);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Giỏ hàng</h1>
      <label className="mb-3 flex gap-2">
        <input
          type="checkbox"
          checked={ids.length === data.items.length}
          onChange={(e) =>
            setSelected(e.target.checked ? data.items.map((i) => i.id) : [])
          }
        />
        Chọn tất cả
      </label>
      <div className="space-y-3">
        {data.items.map((i) => (
          <div
            key={i.id}
            className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white p-4"
          >
            <input
              aria-label={`Chọn ${i.product.name}`}
              type="checkbox"
              checked={ids.includes(i.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...ids, i.id]
                    : ids.filter((id) => id !== i.id),
                )
              }
            />
            <img
              src={i.product.images[0]?.url}
              alt=""
              className="h-16 w-16 rounded object-cover"
            />
            <div className="min-w-32 flex-1">
              <Link to={`/product/${i.productId}`} className="font-medium">
                {i.product.name}
              </Link>
              <p className="text-xs text-slate-500">
                {i.product.shop.name} · {i.variant.name}
              </p>
              <p className="text-brand">{formatVnd(i.variant.price)}</p>
              {(!i.variant.isActive || i.variant.stock < i.quantity) && (
                <p className="text-xs text-red-600">
                  Phân loại không còn bán hoặc không đủ tồn kho
                </p>
              )}
            </div>
            <input
              aria-label="Số lượng"
              type="number"
              min={1}
              max={i.variant.stock}
              value={i.quantity}
              disabled={update.isPending}
              onChange={(e) => {
                const quantity = Number(e.target.value);
                if (Number.isInteger(quantity) && quantity > 0)
                  update.mutate({ id: i.id, quantity });
              }}
              className="w-20 rounded border p-2"
            />
            <button
              onClick={() => remove.mutate(i.id)}
              className="text-sm text-red-600"
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
      {(update.error || remove.error) && (
        <p className="mt-3 text-red-600">
          {(update.error as any)?.response?.data?.message ??
            "Thao tác thất bại"}
        </p>
      )}
      <div className="mt-5 flex items-center justify-between rounded bg-white p-4">
        <span>
          Đã chọn {ids.length} sản phẩm · {formatVnd(total)}
        </span>
        <button
          disabled={!ids.length}
          onClick={() => navigate("/checkout", { state: { cartItemIds: ids } })}
          className="rounded bg-brand px-5 py-3 text-white disabled:opacity-50"
        >
          Thanh toán
        </button>
      </div>
    </div>
  );
}
