import { Filter } from 'lucide-react';
import { PublicationListParams, PublicationStatus, Platform } from '../../types/publication';
import { GlassCard } from '../ui/GlassCard';
import { Button3D } from '../ui/Button3D';

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
    <GlassCard className="p-4">
      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-2 text-gray-300 min-w-[100px]">
          <Filter className="w-5 h-5" />
          <span className="font-medium">Фильтры:</span>
        </div>

        {/* Status Filter */}
        <div className="flex-1 w-full">
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="block w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          >
            <option value="" className="bg-surface">Все статусы</option>
            <option value="PENDING" className="bg-surface">В ожидании</option>
            <option value="PROCESSING" className="bg-surface">В обработке</option>
            <option value="PUBLISHED" className="bg-surface">Опубликовано</option>
            <option value="PARTIAL" className="bg-surface">Частично</option>
            <option value="FAILED" className="bg-surface">Ошибка</option>
            <option value="CANCELLED" className="bg-surface">Отменено</option>
          </select>
        </div>

        {/* Platform Filter */}
        <div className="flex-1 w-full">
          <select
            value={filters.platform || ''}
            onChange={handlePlatformChange}
            className="block w-full px-4 py-2 bg-black/20 border border-glass-border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          >
            <option value="" className="bg-surface">Все платформы</option>
            <option value="instagram" className="bg-surface">Instagram</option>
            <option value="tiktok" className="bg-surface">TikTok</option>
            <option value="facebook" className="bg-surface">Facebook</option>
            <option value="youtube" className="bg-surface">YouTube</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button3D
            onClick={handleReset}
            variant="secondary"
            className="w-full md:w-auto"
          >
            Сбросить
          </Button3D>
        )}
      </div>
    </GlassCard>
  );
}
