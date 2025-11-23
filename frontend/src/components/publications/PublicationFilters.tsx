import { Filter } from 'lucide-react';
import { PublicationListParams, PublicationStatus, Platform } from '../../types/publication';

interface PublicationFiltersProps {
  filters: PublicationListParams;
  onFilterChange: (filters: PublicationListParams) => void;
}

export default function PublicationFilters({ filters, onFilterChange }: PublicationFiltersProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as PublicationStatus | '';
    onFilterChange({
      ...filters,
      status: status || undefined,
    });
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const platform = e.target.value as Platform | '';
    onFilterChange({
      ...filters,
      platform: platform || undefined,
    });
  };

  const handleReset = () => {
    onFilterChange({
      page: 1,
      limit: filters.limit || 20,
    });
  };

  const hasActiveFilters = filters.status || filters.platform;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <span className="font-medium">Фильтры:</span>
        </div>

        {/* Status Filter */}
        <div className="flex-1">
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Все статусы</option>
            <option value="PENDING">В ожидании</option>
            <option value="PROCESSING">В обработке</option>
            <option value="PUBLISHED">Опубликовано</option>
            <option value="PARTIAL">Частично</option>
            <option value="FAILED">Ошибка</option>
            <option value="CANCELLED">Отменено</option>
          </select>
        </div>

        {/* Platform Filter */}
        <div className="flex-1">
          <select
            value={filters.platform || ''}
            onChange={handlePlatformChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Все платформы</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}

