import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { Starfall } from '../components/ui/Starfall';
import { motion } from 'framer-motion';
import { Key, Mail, User, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

// Validation schemas
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Введіть старий пароль'),
    newPassword: z
      .string()
      .min(8, 'Мінімум 8 символів')
      .regex(/[A-Z]/, 'Потрібна хоча б одна велика літера')
      .regex(/[a-z]/, 'Потрібна хоча б одна маленька літера')
      .regex(/[0-9]/, 'Потрібна хоча б одна цифра'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Паролі не співпадають',
    path: ['confirmPassword'],
  });

const changeEmailSchema = z.object({
  newEmail: z.string().email('Невірний формат email'),
  password: z.string().min(1, 'Введіть пароль для підтвердження'),
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
type ChangeEmailFormData = z.infer<typeof changeEmailSchema>;
type TabType = 'profile' | 'password' | 'email';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon: Icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
        active
          ? 'text-white bg-primary/20 border-b-2 border-primary'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2 ${active ? 'text-primary' : ''}`} />
      {children}
    </button>
  );
}

// Profile Section Component
function ProfileSection() {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="ml-4">
            <h2 className="text-2xl font-bold text-white">{user?.email}</h2>
            <p className="text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center p-4 bg-black/20 rounded-lg border border-glass-border">
            <Mail className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-white">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-black/20 rounded-lg border border-glass-border">
            <Shield className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-xs text-gray-400">Роль</p>
              <p className="text-white capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-black/20 rounded-lg border border-glass-border">
            <Calendar className="w-5 h-5 text-primary mr-3" />
            <div>
              <p className="text-xs text-gray-400">Дата реєстрації</p>
              <p className="text-white">Невідомо</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Change Password Section Component
function ChangePasswordSection() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      apiService.changePassword(data.oldPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Пароль успішно змінено!');
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Помилка зміни пароля');
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-white">Змінити пароль</h2>
            <p className="text-sm text-gray-400">Оновіть свій пароль для підвищення безпеки</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-400 mb-2">
              Старий пароль
            </label>
            <input
              {...register('oldPassword')}
              type="password"
              id="oldPassword"
              className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Введіть старий пароль"
            />
            {errors.oldPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.oldPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400 mb-2">
              Новий пароль
            </label>
            <input
              {...register('newPassword')}
              type="password"
              id="newPassword"
              className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Введіть новий пароль"
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.newPassword.message}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Мінімум 8 символів, велика літера, маленька літера та цифра
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Підтвердження нового пароля
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Підтвердіть новий пароль"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button3D
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="w-full bg-gradient-to-r from-primary to-secondary border-none"
          >
            {changePasswordMutation.isPending ? 'Зміна пароля...' : 'Змінити пароль'}
          </Button3D>
        </form>
      </GlassCard>
    </motion.div>
  );
}

// Change Email Section Component
function ChangeEmailSection() {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
  });

  const changeEmailMutation = useMutation({
    mutationFn: (data: ChangeEmailFormData) => apiService.changeEmail(data.newEmail, data.password),
    onSuccess: data => {
      updateUser(data.user, data.token);
      toast.success('Email успішно змінено!');
      reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Помилка зміни email');
    },
  });

  const onSubmit = (data: ChangeEmailFormData) => {
    changeEmailMutation.mutate(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-bold text-white">Змінити email</h2>
            <p className="text-sm text-gray-400">Оновіть адресу електронної пошти</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <span className="font-medium">Поточний email:</span> {user?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="newEmail" className="block text-sm font-medium text-gray-400 mb-2">
              Новий email
            </label>
            <input
              {...register('newEmail')}
              type="email"
              id="newEmail"
              className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Введіть новий email"
            />
            {errors.newEmail && (
              <p className="mt-1 text-sm text-red-400">{errors.newEmail.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
              Пароль для підтвердження
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              className="w-full px-4 py-3 bg-black/20 border border-glass-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Введіть ваш пароль"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          <Button3D
            type="submit"
            disabled={changeEmailMutation.isPending}
            className="w-full bg-gradient-to-r from-primary to-secondary border-none"
          >
            {changeEmailMutation.isPending ? 'Зміна email...' : 'Змінити email'}
          </Button3D>
        </form>

        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-xs text-yellow-300">
            ⚠️ Після зміни email вам потрібно буде використовувати новий email для входу в систему.
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Main Settings Component
export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <Starfall />

      <div className="relative z-10 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white">Налаштування профілю</h1>
          <p className="mt-2 text-gray-400">Керуйте своїм акаунтом та налаштуваннями безпеки</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-glass-border">
          <TabButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={User}
          >
            Профіль
          </TabButton>
          <TabButton
            active={activeTab === 'password'}
            onClick={() => setActiveTab('password')}
            icon={Key}
          >
            Змінити пароль
          </TabButton>
          <TabButton
            active={activeTab === 'email'}
            onClick={() => setActiveTab('email')}
            icon={Mail}
          >
            Змінити email
          </TabButton>
        </div>

        {/* Content */}
        <div className="max-w-2xl">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'password' && <ChangePasswordSection />}
          {activeTab === 'email' && <ChangeEmailSection />}
        </div>
      </div>
    </div>
  );
}
