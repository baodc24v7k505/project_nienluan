import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../../api/auth';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SELLER']),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CUSTOMER' },
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await registerApi(values);
      const { user, accessToken } = await login(values.email, values.password);
      setAuth(user, accessToken);
      navigate('/', { replace: true });
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Đăng ký thất bại');
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Tạo tài khoản</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Họ và tên</label>
          <input
            {...formRegister('fullName')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Email</label>
          <input
            {...formRegister('email')}
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Số điện thoại (tùy chọn)</label>
          <input
            {...formRegister('phone')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Mật khẩu</label>
          <input
            {...formRegister('password')}
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Loại tài khoản</label>
          <select
            {...formRegister('role')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="CUSTOMER">Khách hàng</option>
            <option value="SELLER">Người bán</option>
          </select>
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-slate-900 underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
