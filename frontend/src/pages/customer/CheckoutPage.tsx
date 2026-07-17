import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { getCart } from '../../api/cart';
import { createAddress, listAddresses } from '../../api/addresses';
import { checkout } from '../../api/orders';
import { createMomoPayment } from '../../api/payments';
import { validateVoucher } from '../../api/vouchers';
import { formatVnd } from '../../lib/format';
import type { PaymentMethod } from '../../types/order';
import type { VoucherApplication } from '../../types/voucher';

const addressSchema = z.object({
  recipientName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().min(8, 'Số điện thoại không hợp lệ'),
  line: z.string().min(4, 'Địa chỉ tối thiểu 4 ký tự'),
  city: z.string().min(2, 'Tỉnh/thành phố tối thiểu 2 ký tự'),
});
type AddressFormValues = z.infer<typeof addressSchema>;

export function CheckoutPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [serverError, setServerError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherApplication | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: getCart });
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: listAddresses,
  });

  useEffect(() => {
    if (!selectedAddressId && addresses && addresses.length > 0) {
      setSelectedAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({ resolver: zodResolver(addressSchema) });

  const createAddressMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: (address) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(address.id);
      setShowNewAddress(false);
      reset();
    },
  });

  const validateVoucherMutation = useMutation({ mutationFn: validateVoucher });

  const checkoutMutation = useMutation({
    mutationFn: () => checkout(selectedAddressId, paymentMethod, appliedVoucher?.code),
    onSuccess: async (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (order.paymentMethod === 'MOMO') {
        setRedirecting(true);
        const { payUrl } = await createMomoPayment(order.id);
        window.location.href = payUrl;
        return;
      }
      navigate(`/orders?justPlaced=${order.id}`);
    },
  });

  async function onCreateAddress(values: AddressFormValues) {
    await createAddressMutation.mutateAsync(values);
  }

  async function handleApplyVoucher() {
    setVoucherError(null);
    if (!voucherInput.trim()) return;
    try {
      const result = await validateVoucherMutation.mutateAsync(voucherInput.trim());
      setAppliedVoucher(result);
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err?.response?.data?.message ?? 'Mã voucher không hợp lệ');
    }
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError(null);
  }

  async function handlePlaceOrder() {
    setServerError(null);
    if (!selectedAddressId) {
      setServerError('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    try {
      await checkoutMutation.mutateAsync();
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Đặt hàng thất bại');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Địa chỉ giao hàng</h1>
        <div className="flex flex-col gap-2">
          {addresses?.map((addr) => (
            <label
              key={addr.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                selectedAddressId === addr.id
                  ? 'border-brand'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                checked={selectedAddressId === addr.id}
                onChange={() => setSelectedAddressId(addr.id)}
                className="mt-1"
              />
              <div className="text-sm">
                <p className="font-medium text-slate-900">
                  {addr.recipientName} — {addr.phone}
                </p>
                <p className="text-slate-500">
                  {addr.line}, {addr.city}
                </p>
              </div>
            </label>
          ))}
        </div>

        {!showNewAddress ? (
          <button
            onClick={() => setShowNewAddress(true)}
            className="mt-3 text-sm text-slate-900 underline"
          >
            + Thêm địa chỉ mới
          </button>
        ) : (
          <form
            onSubmit={handleSubmit(onCreateAddress)}
            className="mt-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div>
              <input
                {...register('recipientName')}
                placeholder="Họ và tên người nhận"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.recipientName && (
                <p className="mt-1 text-xs text-red-600">{errors.recipientName.message}</p>
              )}
            </div>
            <div>
              <input
                {...register('phone')}
                placeholder="Số điện thoại"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <input
                {...register('line')}
                placeholder="Địa chỉ (số nhà, đường)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.line && <p className="mt-1 text-xs text-red-600">{errors.line.message}</p>}
            </div>
            <div>
              <input
                {...register('city')}
                placeholder="Tỉnh/Thành phố"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Lưu địa chỉ
              </button>
              <button
                type="button"
                onClick={() => setShowNewAddress(false)}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        <h2 className="mb-2 mt-8 text-lg font-semibold text-slate-900">Phương thức thanh toán</h2>
        <div className="flex flex-col gap-2">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
              paymentMethod === 'COD' ? 'border-brand' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
            />
            Thanh toán khi nhận hàng (COD)
          </label>
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
              paymentMethod === 'MOMO' ? 'border-brand' : 'border-slate-200'
            }`}
          >
            <input
              type="radio"
              checked={paymentMethod === 'MOMO'}
              onChange={() => setPaymentMethod('MOMO')}
            />
            Ví MoMo (sandbox test)
          </label>
        </div>
      </div>

      <div className="h-fit rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Đơn hàng của bạn</h2>
        <div className="flex flex-col gap-2 text-sm">
          {cart?.items.map((item) => (
            <div key={item.id} className="flex justify-between text-slate-600">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>{formatVnd(Number(item.product.price) * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          {appliedVoucher ? (
            <div className="flex items-center justify-between rounded-md bg-brand-bg px-2 py-1.5 text-xs text-brand-dark">
              <span>
                Mã <strong>{appliedVoucher.code}</strong> đã áp dụng
              </span>
              <button onClick={handleRemoveVoucher} className="underline">
                Bỏ
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                placeholder="Nhập mã giảm giá"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase"
              />
              <button
                onClick={handleApplyVoucher}
                disabled={validateVoucherMutation.isPending}
                className="flex-shrink-0 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Áp dụng
              </button>
            </div>
          )}
          {voucherError && <p className="mt-1 text-xs text-red-600">{voucherError}</p>}
        </div>

        <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Tạm tính</span>
            <span>{formatVnd(cart?.total ?? 0)}</span>
          </div>
          {appliedVoucher && (
            <div className="flex justify-between text-brand">
              <span>Giảm giá</span>
              <span>-{formatVnd(appliedVoucher.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <span>Tổng cộng</span>
            <span className="text-brand">
              {formatVnd((cart?.total ?? 0) - (appliedVoucher?.discountAmount ?? 0))}
            </span>
          </div>
        </div>
        {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
        <button
          onClick={handlePlaceOrder}
          disabled={checkoutMutation.isPending || redirecting || !cart?.items.length}
          className="mt-4 w-full rounded-md bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {redirecting
            ? 'Đang chuyển đến MoMo...'
            : checkoutMutation.isPending
              ? 'Đang đặt hàng...'
              : 'Đặt hàng'}
        </button>
      </div>
    </div>
  );
}
