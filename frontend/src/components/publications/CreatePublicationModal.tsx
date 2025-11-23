import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Send } from 'lucide-react';
import VideoUploadZone from './VideoUploadZone';
import PlatformSelector from './PlatformSelector';
import { apiService } from '../../services/api';
import { UploadResult, Platform } from '../../types/publication';

interface CreatePublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePublicationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePublicationModalProps) {
  const [step, setStep] = useState<'upload' | 'details'>('upload');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleUploadSuccess = (result: UploadResult) => {
    setUploadResult(result);
    setStep('details');
  };

  const handleBack = () => {
    setStep('upload');
    setUploadResult(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Введите название';
    } else if (title.length > 200) {
      newErrors.title = 'Название слишком длинное (макс 200 символов)';
    }

    if (description.length > 5000) {
      newErrors.description = 'Описание слишком длинное (макс 5000 символов)';
    }

    if (platforms.length === 0) {
      newErrors.platforms = 'Выберите хотя бы одну платформу';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !uploadResult) return;

    setSubmitting(true);
    try {
      const publication = await apiService.createPublication({
        title: title.trim(),
        description: description.trim(),
        videoPath: uploadResult.videoPath,
        thumbnailPath: uploadResult.thumbnailPath,
        platforms,
      });

      alert('Публикация создана!');

      // Automatically send to Make
      try {
        await apiService.publishToMake(publication.id);
        alert('Публикация отправлена в Make');
      } catch (makeError) {
        alert('Не удалось отправить в Make. Попробуйте позже.');
      }

      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка создания публикации';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                {step === 'details' && (
                  <button
                    onClick={handleBack}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  {step === 'upload' ? 'Загрузка видео' : 'Детали публикации'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              <AnimatePresence mode="wait">
                {step === 'upload' ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <VideoUploadZone onUploadSuccess={handleUploadSuccess} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Название
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Введите название публикации"
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                          errors.title
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Описание
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Опишите вашу публикацию (опционально)"
                        rows={4}
                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                          errors.description
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {description.length} / 5000 символов
                      </p>
                    </div>

                    {/* Platform Selector */}
                    <PlatformSelector
                      selected={platforms}
                      onChange={setPlatforms}
                      error={errors.platforms}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step === 'details' && (
              <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Создание...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Создать и опубликовать
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}

