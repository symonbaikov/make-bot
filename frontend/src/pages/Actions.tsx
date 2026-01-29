import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { ListActionsParams, ActionTypeValues } from '../types';
import { Loading } from '../components/Loading';
import { Error } from '../components/Error';
import { EmptyState } from '../components/EmptyState';
import { format } from 'date-fns';
import { GlassCard } from '../components/ui/GlassCard';
import { Button3D } from '../components/ui/Button3D';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export function Actions() {
  const [params, setParams] = useState<ListActionsParams>({
    page: 1,
    limit: 50,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['actions', params],
    queryFn: () => apiService.getActions(params),
  });

  const handleFilterChange = (key: keyof ListActionsParams, value: unknown) => {
    setParams((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) return <Loading />;
  if (error) return <Error message={error instanceof Error ? error.message : 'Не вдалося завантажити дії'} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-3xl font-bold text-white">Журнал активності</h1>
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
                <Filter className="w-4 h-4 mr-2" /> Тип
              </label>
              <select
                value={params.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="" className="bg-surface">Всі</option>
                {ActionTypeValues.map((type) => (
                  <option key={type} value={type} className="bg-surface">
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Search className="w-4 h-4 mr-2" /> Референс
              </label>
              <input
                type="text"
                placeholder="ID сесії, ID транзакції..."
                value={params.ref || ''}
                onChange={(e) => handleFilterChange('ref', e.target.value || undefined)}
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
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                className="w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2" /> Дата закінчення
              </label>
              <input
                type="date"
                value={params.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
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
          <EmptyState title="Дії не знайдено" message="Спробуйте змінити фільтри." />
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-glass-border">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Тип</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Референс</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Сесія</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дата</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {data?.data.map((action, index) => (
                    <>
                      <motion.tr 
                        key={action.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          <span className="px-2 py-1 rounded-md bg-white/10 border border-white/10">
                            {action.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{action.ref || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {action.session?.sessionId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {format(new Date(action.createdAt), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleRow(action.id)}
                            className="text-primary hover:text-primary/80 transition-colors flex items-center"
                          >
                            {expandedRows.has(action.id) ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" /> Приховати
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" /> Показати
                              </>
                            )}
                          </button>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRows.has(action.id) && action.payload && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <td colSpan={5} className="px-6 py-4 bg-black/30">
                              <pre className="text-xs text-gray-300 overflow-auto bg-black/50 p-4 rounded-lg border border-glass-border font-mono">
                                {JSON.stringify(action.payload, null, 2)}
                              </pre>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border">
                <div className="text-sm text-gray-400">
                  Показано {((data.page - 1) * data.limit) + 1} до {Math.min(data.page * data.limit, data.total)} з {data.total} результатів
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
    </div>
  );
}
