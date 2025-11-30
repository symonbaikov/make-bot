import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Send } from 'lucide-react';
import VideoUploadZone from './VideoUploadZone';
import PlatformSelector from './PlatformSelector';
import { apiService } from '../../services/api';
import { UploadResult, Platform } from '../../types/publication';
import { GlassCard } from '../ui/GlassCard';
import { Button3D } from '../ui/Button3D';

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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl"
          >
            <GlassCard className="w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center space-x-3">
                  {step === 'details' && (
                    <button
                      onClick={handleBack}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-white"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <h2 className="text-xl font-semibold text-white">
                    {step === 'upload' ? 'Загрузка видео' : 'Детали публикации'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
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
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                          Название
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          id="title"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Введите название публикации"
                          className={`block w-full px-4 py-2 bg-black/20 border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                            errors.title ? 'border-red-500' : 'border-glass-border'
                          }`}
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                      </div>

                      {/* Description */}
                      <div>
                        <label
                          htmlFor="description"
                          className="block text-sm font-medium text-gray-300 mb-1"
                        >
                          Описание
                        </label>
                        <textarea
                          id="description"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Опишите вашу публикацию (опционально)"
                          rows={4}
                          className={`block w-full px-4 py-2 bg-black/20 border rounded-lg text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${
                            errors.description ? 'border-red-500' : 'border-glass-border'
                          }`}
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-500">{errors.description}</p>
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
                <div className="flex items-center justify-between p-6 border-t border-glass-border bg-black/20">
                  <Button3D
                    onClick={onClose}
                    variant="secondary"
                    className="bg-transparent border border-glass-border hover:bg-white/5"
                  >
                    Отмена
                  </Button3D>
                  <Button3D
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center"
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
                  </Button3D>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
