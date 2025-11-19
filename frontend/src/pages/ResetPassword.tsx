import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const resetPasswordSchema = z.object({
  email: z.string().email('Невірна адреса електронної пошти'),
  code: z.string().length(6, 'Код повинен містити 6 цифр').regex(/^\d+$/, 'Код повинен містити тільки цифри'),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const { loginWithResetCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const emailFromUrl = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromUrl,
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await loginWithResetCode(data.email, data.code);
      toast.success('Вхід успішний!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Reset password login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Невірний або прострочений код';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вхід по коду
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Введіть код, який було надіслано на вашу електронну пошту
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Адреса електронної пошти
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Адреса електронної пошти"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="code" className="sr-only">
                Код
              </label>
              <input
                {...register('code')}
                type="text"
                maxLength={6}
                autoComplete="one-time-code"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Вхід...' : 'Увійти'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Надіслати код ще раз
              </Link>
            </div>
            <div className="text-sm">
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Повернутися до входу
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}





