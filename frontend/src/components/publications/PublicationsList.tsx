import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Trash2, RefreshCw, Eye, Video } from 'lucide-react';
import { apiService } from '../../services/api';
import { Publication, PublicationListParams } from '../../types/publication';
import StatusBadge from './StatusBadge';
import PublicationDetailsModal from './PublicationDetailsModal';

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
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (publications.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Video className="w-16 h-16 mx-auto text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Нет публикаций</h3>
        <p className="mt-2 text-gray-500">
          Создайте свою первую публикацию для кросс-постинга
        </p>
      </div>
    );
  }

  const currentPage = filters.page || 1;
  const limit = filters.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Publications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {publications.map((publication, index) => (
          <motion.div
            key={publication.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200">
              {publication.thumbnailUrl ? (
                <img
                  src={publication.thumbnailUrl}
                  alt={publication.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <StatusBadge status={publication.status} size="sm" />
              </div>
              {publication.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(publication.duration)}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-medium text-gray-900 truncate">{publication.title}</h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{publication.description}</p>

              {/* Platforms */}
              <div className="mt-3 flex flex-wrap gap-1">
                {publication.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <span className="mr-1">{getPlatformIcon(platform)}</span>
                    {platform}
                  </span>
                ))}
              </div>

              {/* Metadata */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{formatFileSize(publication.fileSize)}</span>
                <span>{format(new Date(publication.createdAt), 'dd MMM yyyy', { locale: ru })}</span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPublication(publication)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  Просмотр
                </button>

                {publication.status === 'FAILED' && (
                  <button
                    onClick={() => handleRetry(publication.id)}
                    disabled={retryingId === publication.id}
                    className="inline-flex items-center justify-center p-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    title="Повторить"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${retryingId === publication.id ? 'animate-spin' : ''}`}
                    />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(publication.id)}
                  disabled={deletingId === publication.id}
                  className="inline-flex items-center justify-center p-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Вперед
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Показано <span className="font-medium">{(currentPage - 1) * limit + 1}</span> -{' '}
                <span className="font-medium">{Math.min(currentPage * limit, total)}</span> из{' '}
                <span className="font-medium">{total}</span> публикаций
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Назад
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    page =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => (
                    <>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </>
                  ))}
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вперед
                </button>
              </nav>
            </div>
          </div>
        </div>
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

