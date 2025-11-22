import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { ListSessionsParams, SessionStatus, SessionStatusValues, PlanValues } from '../types';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { EmptyState } from '../components/EmptyState';
import { SendEmailModal } from '../components/SendEmailModal';
import { format } from 'date-fns';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, Mail, Eye } from 'lucide-react';

export function Payments() {
  const [params, setParams] = useState<ListSessionsParams>({
    page: 1,
    limit: 20,
  });
  const [selectedSession, setSelectedSession] = useState<{
    sessionId: string;
    email: string;
    userName?: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', params],
    queryFn: () => apiService.getSessions(params),
  });

  const handleFilterChange = (key: keyof ListSessionsParams, value: unknown) => {
    setParams(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const getStatusColor = (status: SessionStatus) => {
    const colors: Record<SessionStatus, string> = {
      STARTED: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
      AWAITING_PAYMENT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      PAID: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      PAID_PENDING_EMAIL: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
      COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/50',
      REFUNDED: 'bg-red-500/20 text-red-300 border-red-500/50',
      FAILED: 'bg-red-500/20 text-red-300 border-red-500/50',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/50';
  };

  if (isLoading) return <Loading />;
  if (error)
    return (
      <Error
        message={error instanceof Error ? error.message : 'Не вдалося завантажити платежі'}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-3xl font-bold text-white">Платежі</h1>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Filter className="w-4 h-4 mr-2" /> Статус
              </label>
              <select
                value={params.status || ''}
                onChange={e => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="" className="bg-surface">Всі</option>
                {SessionStatusValues.map(status => (
                  <option key={status} value={status} className="bg-surface">
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">План</label>
              <select
                value={params.plan || ''}
                onChange={e => handleFilterChange('plan', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="" className="bg-surface">Всі</option>
                {PlanValues.map(plan => (
                  <option key={plan} value={plan} className="bg-surface">
                    {plan}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Search className="w-4 h-4 mr-2" /> Пошук
              </label>
              <input
                type="text"
                placeholder="ID сесії, Email..."
                value={params.search || ''}
                onChange={e => handleFilterChange('search', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Дата початку
              </label>
              <input
                type="date"
                value={params.startDate || ''}
                onChange={e => handleFilterChange('startDate', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all [color-scheme:dark]"
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {data && data.data.length === 0 ? (
          <EmptyState title="Платежі не знайдено" message="Спробуйте змінити фільтри." />
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-glass-border">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID сесії</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Користувач</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">План</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сума</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дата</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {data?.data.map((session, index) => (
                    <motion.tr 
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {session.sessionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {session.user?.firstName || session.user?.lastName
                          ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {session.finalEmail || session.emailUser || session.emailPaypal || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {session.plan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${session.amount} {session.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(session.status)}`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {format(new Date(session.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          {(session.finalEmail || session.emailUser || session.emailPaypal) && (
                            <button
                              onClick={() => {
                                const finalEmail =
                                  session.finalEmail ||
                                  session.emailUser ||
                                  session.emailPaypal ||
                                  '';
                                const userName =
                                  session.user?.firstName || session.user?.lastName
                                    ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
                                    : undefined;
                                setSelectedSession({
                                  sessionId: session.sessionId,
                                  email: finalEmail,
                                  userName,
                                });
                              }}
                              className="text-primary hover:text-primary/80 transition-colors"
                              title="Відправити email"
                            >
                              <Mail className="w-5 h-5" />
                            </button>
                          )}
                          <Link
                            to={`/payments/${session.sessionId}`}
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border">
                <div className="text-sm text-gray-400">
                  Показано {(data.page - 1) * data.limit + 1} до{' '}
                  {Math.min(data.page * data.limit, data.total)} з {data.total} результатів
                </div>
                <div className="flex space-x-2">
                  <Button3D
                    onClick={() => handlePageChange(data.page - 1)}
                    disabled={data.page === 1}
                    variant="secondary"
                    className="px-4 py-1 text-xs"
                  >
                    Попередня
                  </Button3D>
                  <Button3D
                    onClick={() => handlePageChange(data.page + 1)}
                    disabled={data.page >= data.totalPages}
                    variant="secondary"
                    className="px-4 py-1 text-xs"
                  >
                    Наступна
                  </Button3D>
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </motion.div>

      {/* Send Email Modal */}
      {selectedSession && (
        <SendEmailModal
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          sessionId={selectedSession.sessionId}
          userEmail={selectedSession.email}
          userName={selectedSession.userName}
        />
      )}
    </div>
  );
}
