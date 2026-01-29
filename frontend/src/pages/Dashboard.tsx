import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { GlassCard } from '../components/ui/GlassCard';
import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { getPlanName } from '../utils/plan';

export function Dashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiService.getStats(),
  });

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Error
        message={error instanceof Error ? error.message : 'Не вдалося завантажити статистику'}
        onRetry={() => refetch()}
      />
    );
  if (!stats) return <div>Статистика недоступна</div>;

  const conversionRate =
    stats.conversionFunnel.started > 0
      ? ((stats.conversionFunnel.completed / stats.conversionFunnel.started) * 100).toFixed(1)
      : '0';

  const statsCards = [
    { label: 'Всього сесій', value: stats.totalSessions, icon: Users, color: 'text-blue-400' },
    {
      label: 'Загальний дохід',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-400',
    },
    { label: 'Конверсія', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-purple-400' },
    {
      label: 'Завершено',
      value: stats.conversionFunnel.completed,
      icon: CheckCircle,
      color: 'text-teal-400',
    },
  ];

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-3xl font-bold text-white"
      >
        Панель управління
      </motion.h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-400">{stat.label}</div>
                  <div className="mt-2 text-3xl font-bold text-white">{stat.value}</div>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6 h-full">
            <h2 className="text-xl font-semibold text-white mb-6">Воронка конверсії</h2>
            <div className="space-y-6">
              {[
                { label: 'Почато', value: stats.conversionFunnel.started, color: 'bg-blue-500' },
                {
                  label: 'Очікування оплати',
                  value: stats.conversionFunnel.awaitingPayment,
                  color: 'bg-yellow-500',
                },
                { label: 'Оплачено', value: stats.conversionFunnel.paid, color: 'bg-green-500' },
                {
                  label: 'Завершено',
                  value: stats.conversionFunnel.completed,
                  color: 'bg-teal-500',
                },
              ].map((item, index) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                    <span className="text-sm text-gray-400">{item.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${stats.conversionFunnel.started > 0 ? (item.value / stats.conversionFunnel.started) * 100 : 0}%`,
                      }}
                      transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                      className={`h-full rounded-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Revenue by Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6 h-full">
            <h2 className="text-xl font-semibold text-white mb-6">Дохід за планом</h2>
            <div className="space-y-4">
              {stats.revenueByPlan.map((item, index) => (
                <motion.div
                  key={item.plan}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <span className="text-sm font-medium text-gray-300">
                    {getPlanName(item.plan as any)}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">{item.count} продажів</span>
                    <span className="text-sm font-bold text-green-400">
                      ${item.revenue.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
