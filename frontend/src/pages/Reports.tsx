import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Calendar, Filter, Download } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { uk } from 'date-fns/locale';

type ReportFormat = 'csv' | 'excel';

type ReportPeriod = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'current_year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

export function Reports() {
  const [period, setPeriod] = useState<ReportPeriod>('current_month');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [customRange, setCustomRange] = useState<DateRange>({
    start: formatDate(new Date(), 'yyyy-MM-dd'),
    end: formatDate(new Date(), 'yyyy-MM-dd'),
  });
  const [status, setStatus] = useState<string>('all');
  const [plan, setPlan] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = (): DateRange => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case 'current_month':
        return {
          start: formatDate(new Date(currentYear, currentMonth, 1), 'yyyy-MM-dd'),
          end: formatDate(new Date(currentYear, currentMonth + 1, 0), 'yyyy-MM-dd'),
        };
      case 'last_month':
        return {
          start: formatDate(new Date(currentYear, currentMonth - 1, 1), 'yyyy-MM-dd'),
          end: formatDate(new Date(currentYear, currentMonth, 0), 'yyyy-MM-dd'),
        };
      case 'last_3_months':
        return {
          start: formatDate(new Date(currentYear, currentMonth - 3, 1), 'yyyy-MM-dd'),
          end: formatDate(new Date(currentYear, currentMonth + 1, 0), 'yyyy-MM-dd'),
        };
      case 'last_6_months':
        return {
          start: formatDate(new Date(currentYear, currentMonth - 6, 1), 'yyyy-MM-dd'),
          end: formatDate(new Date(currentYear, currentMonth + 1, 0), 'yyyy-MM-dd'),
        };
      case 'current_year':
        return {
          start: formatDate(new Date(currentYear, 0, 1), 'yyyy-MM-dd'),
          end: formatDate(new Date(currentYear, 11, 31), 'yyyy-MM-dd'),
        };
      case 'custom':
        return customRange;
      default:
        return customRange;
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        format,
      });

      if (status !== 'all') {
        params.append('status', status);
      }

      if (plan !== 'all') {
        params.append('plan', plan);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${dateRange.start}-${dateRange.end}.${format === 'excel' ? 'csv' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Помилка при генерації звіту');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Звіти
          </h1>
          <p className="text-gray-400 mt-2">
            Генеруйте звіти за вибраний період
          </p>
        </div>
        <FileDown className="w-12 h-12 text-primary opacity-50" />
      </motion.div>

      {/* Report Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border p-6 shadow-xl"
      >
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-primary" />
          Параметри звіту
        </h2>

        <div className="space-y-6">
          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <Calendar className="w-4 h-4 inline mr-2" />
              Період
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'current_month', label: 'Поточний місяць' },
                { value: 'last_month', label: 'Минулий місяць' },
                { value: 'last_3_months', label: 'Останні 3 місяці' },
                { value: 'last_6_months', label: 'Останні 6 місяців' },
                { value: 'current_year', label: 'Поточний рік' },
                { value: 'custom', label: 'Власний період' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value as ReportPeriod)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    period === option.value
                      ? 'bg-primary/20 text-primary border-2 border-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                      : 'bg-white/5 text-gray-300 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {period === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Дата початку
                </label>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={(e) =>
                    setCustomRange({ ...customRange, start: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-glass-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Дата закінчення
                </label>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={(e) =>
                    setCustomRange({ ...customRange, end: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-glass-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </motion.div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Статус
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-glass-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">Всі статуси</option>
              <option value="started">Початок</option>
              <option value="awaiting_payment">Очікування оплати</option>
              <option value="paid">Оплачено</option>
              <option value="completed">Завершено</option>
              <option value="failed">Невдала</option>
              <option value="refunded">Повернуто</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              План
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-glass-border rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">Всі плани</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Формат
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('csv')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  format === 'csv'
                    ? 'bg-primary/20 text-primary border-2 border-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                    : 'bg-white/5 text-gray-300 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  format === 'excel'
                    ? 'bg-primary/20 text-primary border-2 border-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                    : 'bg-white/5 text-gray-300 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                Excel (CSV)
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Preview */}
        {period !== 'custom' && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-glass-border">
            <p className="text-sm text-gray-400">
              Період звіту:{' '}
              <span className="text-white font-medium">
                {formatDate(new Date(getDateRange().start), 'dd MMMM yyyy', { locale: uk })}
              </span>
              {' — '}
              <span className="text-white font-medium">
                {formatDate(new Date(getDateRange().end), 'dd MMMM yyyy', { locale: uk })}
              </span>
            </p>
          </div>
        )}

        {/* Generate Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl font-semibold text-white shadow-lg hover:shadow-primary/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
              Генерація звіту...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-3" />
              Згенерувати та завантажити звіт
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold mb-4">Що включає звіт?</h3>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>ID сесії та транзакції</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>План підписки та сума оплати</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Email адреси (від користувача та PayPal)</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Статус платежу та дати</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Інформація про користувача (ім'я, прізвище)</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

