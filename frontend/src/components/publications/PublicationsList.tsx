import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trash2, RefreshCw, Eye, Video } from 'lucide-react';
import { apiService } from '../../services/api';
import { Publication, PublicationListParams } from '../../types/publication';
import StatusBadge from './StatusBadge';
import PublicationDetailsModal from './PublicationDetailsModal';
import { GlassCard } from '../ui/GlassCard';
import { Button3D } from '../ui/Button3D';
import { Loading } from '../Loading';

interface PublicationsListProps {
  filters: PublicationListParams;
  onPageChange: (page: number) => void;
  onPublicationDeleted: () => void;
}

export default function PublicationsList({
  filters,
  onPageChange,
  onPublicationDeleted,
}: PublicationsListProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPublications();
  }, [filters]);

  const fetchPublications = async () => {
    setLoading(true);
    try {
      const response = await apiService.getPublications(filters);
      setPublications(response.publications);
      setTotal(response.total);
    } catch (error) {
      alert('Ошибка загрузки публикаций');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту публикацию?')) return;

    setDeletingId(id);
    try {
      await apiService.deletePublication(id);
      alert('Публикация удалена');
      onPublicationDeleted();
      fetchPublications();
    } catch (error) {
      alert('Ошибка удаления публикации');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await apiService.retryPublication(id);
      alert('Публикация отправлена повторно');
      fetchPublications();
    } catch (error) {
      alert('Ошибка повторной отправки');
    } finally {
      setRetryingId(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: '📷',
      tiktok: '🎵',
      facebook: '📘',
      youtube: '▶️',
    };
    return icons[platform] || '📱';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <Loading />;
  }

  if (publications.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-medium text-white">Нет публикаций</h3>
        <p className="mt-2 text-gray-400">Создайте свою первую публикацию для кросс-постинга</p>
      </GlassCard>
    );
  }

  const currentPage = filters.page || 1;
  const limit = filters.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Publications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publications.map((publication, index) => (
          <motion.div
            key={publication.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <GlassCard className="h-full flex flex-col overflow-hidden group hover:border-primary/50 transition-colors p-0">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-black/50">
                {publication.thumbnailUrl ? (
                  <img
                    src={publication.thumbnailUrl}
                    alt={publication.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={publication.status} size="sm" />
                </div>
                {publication.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    {formatDuration(publication.duration)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-medium text-white truncate text-lg">{publication.title}</h3>
                <p className="mt-1 text-sm text-gray-400 line-clamp-2">{publication.description}</p>

                {/* Platforms */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {publication.platforms.map(platform => (
                    <span
                      key={platform}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10"
                    >
                      <span className="mr-1">{getPlatformIcon(platform)}</span>
                      {platform}
                    </span>
                  ))}
                </div>

                {/* Metadata */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t border-glass-border pt-3">
                  <span>{formatFileSize(publication.fileSize)}</span>
                  <span>
                    {format(new Date(publication.createdAt), 'dd MMM yyyy', { locale: ru })}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center space-x-2">
                  <Button3D
                    onClick={() => setSelectedPublication(publication)}
                    variant="secondary"
                    className="flex-1 py-1.5 text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Просмотр
                  </Button3D>

                  {publication.status === 'FAILED' && (
                    <Button3D
                      onClick={() => handleRetry(publication.id)}
                      disabled={retryingId === publication.id}
                      variant="secondary"
                      className="px-3 py-1.5"
                      title="Повторить"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${retryingId === publication.id ? 'animate-spin' : ''}`}
                      />
                    </Button3D>
                  )}

                  <Button3D
                    onClick={() => handleDelete(publication.id)}
                    disabled={deletingId === publication.id}
                    variant="danger"
                    className="px-3 py-1.5"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button3D>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <GlassCard className="flex items-center justify-between px-6 py-4">
          <div className="text-sm text-gray-400">
            Показано <span className="font-medium text-white">{(currentPage - 1) * limit + 1}</span> -{' '}
            <span className="font-medium text-white">{Math.min(currentPage * limit, total)}</span> из{' '}
            <span className="font-medium text-white">{total}</span> публикаций
          </div>
          <div className="flex space-x-2">
            <Button3D
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="secondary"
              className="px-4 py-1.5 text-xs"
            >
              Назад
            </Button3D>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  page =>
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                )
                .map((page, index, array) => (
                  <div key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => onPageChange(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-primary text-white shadow-lg shadow-primary/25'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))}
            </div>

            <Button3D
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="secondary"
              className="px-4 py-1.5 text-xs"
            >
              Вперед
            </Button3D>
          </div>
        </GlassCard>
      )}

      {/* Details Modal */}
      {selectedPublication && (
        <PublicationDetailsModal
          publication={selectedPublication}
          onClose={() => setSelectedPublication(null)}
          onUpdate={fetchPublications}
        />
      )}
    </div>
  );
}
