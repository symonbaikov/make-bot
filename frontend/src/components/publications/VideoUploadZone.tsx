import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { UploadResult } from '../../types/publication';

interface VideoUploadZoneProps {
  onUploadSuccess: (result: UploadResult) => void;
}

export default function VideoUploadZone({ onUploadSuccess }: VideoUploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setError(null);
      setProgress(0);

      try {
        const result = await apiService.uploadVideo(file, setProgress);
        setUploadedFile(result);
        onUploadSuccess(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки видео';
        setError(errorMessage);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
    onDrop: handleFileDrop,
    disabled: uploading || !!uploadedFile,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setUploadedFile(null);
    setError(null);
    setProgress(0);
  };

  if (uploadedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border-2 border-green-200 rounded-lg p-6 bg-green-50"
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-green-900">Видео загружено!</h3>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>
                <strong>Размер:</strong> {formatFileSize(uploadedFile.metadata.fileSize)}
              </p>
              <p>
                <strong>Длительность:</strong> {formatDuration(uploadedFile.metadata.duration)}
              </p>
              <p>
                <strong>Формат:</strong> {uploadedFile.metadata.format.toUpperCase()}
              </p>
              {uploadedFile.metadata.resolution && (
                <p>
                  <strong>Разрешение:</strong> {uploadedFile.metadata.resolution}
                </p>
              )}
            </div>
            <button
              onClick={handleReset}
              className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Загрузить другое видео
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-2 border-red-200 rounded-lg p-6 bg-red-50"
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900">Ошибка загрузки</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={handleReset}
              className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <Upload className="w-12 h-12 text-blue-500 animate-bounce" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">Загрузка видео...</p>
                <p className="text-sm text-gray-500 mt-1">{progress}%</p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-blue-500"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <Video className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Отпустите файл здесь' : 'Перетащите видео или нажмите для выбора'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  MP4, MOV, AVI, MKV (макс 500MB, до 10 минут)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

