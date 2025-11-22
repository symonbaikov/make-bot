import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Невірна адреса електронної пошти'),
  password: z.string().min(1, 'Пароль обов\'язковий'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success('Вхід успішний!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Помилка входу';
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
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Make Bot
            </h2>
            <p className="mt-2 text-gray-400">Вхід до адмін-панелі</p>
          </div>

          <form className="space-y-6" onSubmit={handleFormSubmit}>
            <div className="space-y-4">
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
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Пароль
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Забули пароль?
              </Link>
            </div>

            <Button3D
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Вхід...' : 'Увійти'}
            </Button3D>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}

