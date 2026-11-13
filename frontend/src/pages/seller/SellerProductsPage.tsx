import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMyShop } from "../../api/shops";
import { listCategories } from "../../api/categories";
import {
  createMyProduct,
  deleteMyProduct,
  listMyProducts,
  updateMyProduct,
} from "../../api/products";
import type { Product } from "../../types/product";
import { formatVnd } from "../../lib/format";
import { ImageUpload } from "../../components/ImageUpload";
import { Pagination } from "../../components/Pagination";

const schema = z.object({
  name: z.string().min(2, "Tên sản phẩm tối thiểu 2 ký tự"),
  description: z.string().optional(),
  price: z.number().int().min(1, "Giá phải là số nguyên VNĐ lớn hơn 0"),
  stock: z.number().int().min(0, "Số lượng phải >= 0"),
  categoryId: z.string().optional(),
  imagesText: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const statusLabel: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang bán",
  HIDDEN: "Đã ẩn",
};

function toImageList(text?: string): string[] {
  return (text ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SellerProductsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [variants, setVariants] = useState<
    { sku: string; name: string; price: number; stock: number }[]
  >([]);

  const { data: shop } = useQuery({
    queryKey: ["my-shop"],
    queryFn: getMyShop,
    retry: false,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["my-products", page],
    queryFn: () => listMyProducts({ page }),
    enabled: !!shop && shop.status === "APPROVED",
  });

  const {
    register,
    getValues,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: createMyProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      reset({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        categoryId: "",
        imagesText: "",
      });
      setVariants([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: {
      id: string;
      payload: Parameters<typeof updateMyProduct>[1];
    }) => updateMyProduct(params.id, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      setEditing(null);
      setVariants([]);
      reset({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        categoryId: "",
        imagesText: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMyProduct,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-products"] }),
  });

  function startEdit(product: Product) {
    setVariants(
      product.variants.map((v) => ({
        sku: v.sku,
        name: v.name,
        price: Number(v.price),
        stock: v.stock,
      })),
    );
    setEditing(product);
    reset({
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price),
      stock: product.stock,
      categoryId: product.categoryId ?? "",
      imagesText: product.images.map((i) => i.url).join("\n"),
    });
  }

  function cancelEdit() {
    setVariants([]);
    setEditing(null);
    reset({
      name: "",
      description: "",
      price: 0,
      stock: 0,
      categoryId: "",
      imagesText: "",
    });
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const payload = {
      name: values.name,
      description: values.description || undefined,
      price: values.price,
      stock: values.stock,
      categoryId: values.categoryId || undefined,
      images: toImageList(values.imagesText),
      variants: variants.length ? variants : undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? "Thao tác thất bại");
    }
  }

  if (!shop || shop.status !== "APPROVED") {
    return (
      <p className="text-slate-500">
        Bạn cần đăng ký shop và chờ admin duyệt trước khi đăng sản phẩm.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          {editing ? `Sửa: ${editing.name}` : "Thêm sản phẩm mới"}
        </h2>
        <div>
          <input
            {...register("name")}
            placeholder="Tên sản phẩm"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <textarea
          {...register("description")}
          placeholder="Mô tả (tùy chọn)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              {...register("price", { valueAsNumber: true })}
              readOnly={variants.length > 0}
              type="number"
              placeholder="Giá (VNĐ)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.price && (
              <p className="mt-1 text-xs text-red-600">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <input
              {...register("stock", { valueAsNumber: true })}
              readOnly={variants.length > 0}
              type="number"
              placeholder="Số lượng"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.stock && (
              <p className="mt-1 text-xs text-red-600">
                {errors.stock.message}
              </p>
            )}
          </div>
        </div>
        <select
          {...register("categoryId")}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Không chọn danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <textarea
          {...register("imagesText")}
          placeholder="URL hình ảnh (mỗi dòng một URL)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <ImageUpload
          onUpload={(url) =>
            setValue(
              "imagesText",
              [getValues("imagesText"), url].filter(Boolean).join("\n"),
            )
          }
        />
        <div className="space-y-2 rounded border border-slate-200 p-3">
          <p className="text-sm font-semibold">Phân loại và SKU</p>
          <p className="text-xs text-slate-500">
            Mỗi SKU có giá và tồn kho riêng. Giữ nguyên SKU khi chỉnh sửa để bảo
            toàn lịch sử.
          </p>
          {variants.map((v, idx) => (
            <div key={idx} className="space-y-1 rounded bg-slate-50 p-2">
              {(["sku", "name", "price", "stock"] as const).map((field) => (
                <label key={field} className="flex items-center gap-2 text-xs">
                  <span className="w-12">
                    {
                      { sku: "SKU", name: "Tên", price: "Giá", stock: "Kho" }[
                        field
                      ]
                    }
                  </span>
                  <input
                    aria-label={`${field} ${idx + 1}`}
                    className="min-w-0 flex-1 rounded border p-1"
                    type={
                      field === "price" || field === "stock" ? "number" : "text"
                    }
                    min={field === "price" ? 1 : 0}
                    required
                    value={v[field]}
                    onChange={(e) =>
                      setVariants((rows) =>
                        rows.map((row, i) =>
                          i === idx
                            ? {
                                ...row,
                                [field]:
                                  field === "price" || field === "stock"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              }
                            : row,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={!!editing && variants.length === 1}
                className="text-xs text-red-600 disabled:opacity-30"
                onClick={() =>
                  setVariants((rows) => rows.filter((_, i) => i !== idx))
                }
              >
                Bỏ phân loại
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-brand"
            onClick={() => {
              const basePrice = getValues("price") || 10000;
              if (!variants.length) {
                setValue("price", basePrice);
                setValue("stock", getValues("stock") || 0);
              }
              setVariants((rows) => [
                ...rows,
                {
                  sku: `SKU-${rows.length + 1}`,
                  name: "",
                  price: basePrice,
                  stock: 10,
                },
              ]);
            }}
          >
            + Thêm phân loại
          </button>
        </div>
        {variants.length > 0 && (
          <p className="text-xs text-slate-500">
            Giá hiển thị và tổng kho được tính tự động từ các phân loại.
          </p>
        )}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {editing ? "Lưu thay đổi" : "Thêm sản phẩm"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div>
        {isLoading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Sản phẩm</th>
                <th>Giá</th>
                <th>Kho</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2">{p.name}</td>
                  <td>{formatVnd(p.price)}</td>
                  <td>{p.stock}</td>
                  <td>{statusLabel[p.status]}</td>
                  <td className="flex justify-end gap-2 py-2 text-right">
                    <button
                      onClick={() => startEdit(p)}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(p.id)}
                      className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Ngừng bán
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.items.length === 0 && (
          <p className="mt-4 text-center text-slate-400">
            Chưa có sản phẩm nào
          </p>
        )}
        {data && (
          <Pagination
            page={page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
