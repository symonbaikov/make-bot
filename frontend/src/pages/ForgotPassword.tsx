import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiService } from '../services/api';
import { toast } from 'react-toastify';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { motion } from 'framer-motion';

const forgotPasswordSchema = z.object({
  email: z.string().email('Невірна адреса електронної пошти'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await apiService.requestPasswordReset(data.email);
      setEmail(data.email);
      setIsSuccess(true);
      toast.success('Код надіслано на вашу електронну пошту');
    } catch (error) {
      console.error('Request password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Помилка відправки коду';
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/30 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <GlassCard className="p-8">
          {isSuccess ? (
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Код надіслано
                </h2>
                <p className="text-gray-300">
                  Перевірте вашу електронну пошту та використайте код для входу
                </p>
              </div>
              
              <Button3D
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full"
              >
                Перейти до входу по коду
              </Button3D>

              <div>
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Повернутися до входу
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Забули пароль?
                </h2>
                <p className="text-gray-300 text-sm">
                  Введіть вашу електронну пошту, і ми надішлемо вам код для входу
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleFormSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                    placeholder="name@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <Button3D
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Відправка...' : 'Надіслати код'}
                </Button3D>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Повернутися до входу
                  </Link>
                </div>
              </form>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}

