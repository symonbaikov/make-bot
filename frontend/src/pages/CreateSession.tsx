import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { toast } from 'react-toastify';
import { useState } from 'react';

const createSessionSchema = z.object({
  plan: z.enum(['BASIC', 'STANDARD', 'PREMIUM'] as const),
  amount: z.number().positive('Сума повинна бути додатньою'),
  currency: z.string().default('USD'),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;

export function CreateSession() {
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      currency: 'USD',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSessionFormData) => apiService.createSession(data),
    onSuccess: data => {
      toast.success('Сесію успішно створено!');
      setCreatedLink(data.botLink);
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не вдалося створити сесію');
    },
  });

  const onSubmit = (data: CreateSessionFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Створити сесію</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              План
            </label>
            <select
              {...register('plan')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="BASIC">BASIC</option>
              <option value="STANDARD">STANDARD</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
            {errors.plan && <p className="mt-1 text-sm text-red-600">{errors.plan.message}</p>}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Сума
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Валюта
            </label>
            <input
              {...register('currency')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.currency && (
              <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Створення...' : 'Створити сесію'}
          </button>
        </form>

        {createdLink && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-800 mb-2">Сесію створено!</h3>
            <p className="text-sm text-green-700 mb-2">Посилання на бота:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={createdLink}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-md text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdLink);
                  toast.success('Посилання скопійовано!');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Копіювати
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
