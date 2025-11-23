import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, HardDrive, Video as VideoIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Publication } from '../../types/publication';
import StatusBadge from './StatusBadge';

interface PublicationDetailsModalProps {
  publication: Publication;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PublicationDetailsModal({
  publication,
  onClose,
}: PublicationDetailsModalProps) {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Детали публикации</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
              {/* Video Preview */}
              {publication.videoUrl && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={publication.videoUrl}
                    controls
                    className="w-full h-full"
                    poster={publication.thumbnailUrl}
                  />
                </div>
              )}

              {/* Basic Info */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900">{publication.title}</h3>
                    <p className="mt-2 text-gray-600">{publication.description}</p>
                  </div>
                  <div className="ml-4">
                    <StatusBadge status={publication.status} />
                  </div>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Платформы:</h4>
                <div className="flex flex-wrap gap-2">
                  {publication.platforms.map(platform => (
                    <span
                      key={platform}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      <span className="mr-1.5">{getPlatformIcon(platform)}</span>
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <Clock className="w-4 h-4 mr-1" />
                    Длительность
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatDuration(publication.duration)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <HardDrive className="w-4 h-4 mr-1" />
                    Размер файла
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatFileSize(publication.fileSize)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <VideoIcon className="w-4 h-4 mr-1" />
                    Формат
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {publication.format?.toUpperCase() || 'N/A'}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <VideoIcon className="w-4 h-4 mr-1" />
                    Разрешение
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {publication.resolution || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Временные метки:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium mr-2">Создано:</span>
                    {format(new Date(publication.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  </div>
                  {publication.publishedAt && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="font-medium mr-2">Опубликовано:</span>
                      {format(new Date(publication.publishedAt), 'dd MMMM yyyy, HH:mm', {
                        locale: ru,
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Platform Results */}
              {publication.publishResults && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Результаты публикации:
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(publication.publishResults).map(([platform, result]) => (
                      <div
                        key={platform}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          result.success ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="mr-2">{getPlatformIcon(platform)}</span>
                          <span className="font-medium capitalize">{platform}</span>
                        </div>
                        <div className="text-right">
                          {result.success ? (
                            <>
                              <span className="text-sm text-green-700 font-medium">
                                ✓ Опубликовано
                              </span>
                              {result.url && (
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:underline mt-1"
                                >
                                  Открыть пост
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-red-700">{result.error || 'Ошибка'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Make Webhook Info */}
              {publication.makeWebhookSent && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Make Webhook:</h4>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Отправлено
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

