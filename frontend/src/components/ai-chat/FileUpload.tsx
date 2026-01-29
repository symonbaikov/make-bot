import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface FileUploadProps {
  onSessionCreated: (sessionId: string) => void;
}

interface UploadResponse {
  sessionId: string;
  fileName: string;
  summary: {
    totalRecords: number;
    columns?: string[];
    metrics?: {
      totalRevenue?: number;
      totalSessions?: number;
      avgAmount?: number;
    };
  };
  suggestedQuestions: string[];
}

export function FileUpload({ onSessionCreated }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadResponse | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const response = await axios.post<{ success: boolean; data: UploadResponse }>(
        '/api/admin/ai-chat/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success && response.data.data) {
        setUploadedData(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Помилка завантаження файлу');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleStartChat = () => {
    if (uploadedData) {
      onSessionCreated(uploadedData.sessionId);
    }
  };

  if (uploadedData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border p-8 shadow-xl"
      >
        <div className="flex items-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <h3 className="text-xl font-semibold text-white">Файл успішно завантажено!</h3>
            <p className="text-gray-400">{uploadedData.fileName}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Інформація про дані:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400">Всього записів</p>
                <p className="text-lg font-semibold text-white">
                  {uploadedData.summary.totalRecords}
                </p>
              </div>
              {uploadedData.summary.metrics?.totalRevenue && (
                <div>
                  <p className="text-xs text-gray-400">Загальний дохід</p>
                  <p className="text-lg font-semibold text-green-400">
                    ${uploadedData.summary.metrics.totalRevenue.toFixed(2)}
                  </p>
                </div>
              )}
              {uploadedData.summary.metrics?.avgAmount && (
                <div>
                  <p className="text-xs text-gray-400">Середній чек</p>
                  <p className="text-lg font-semibold text-blue-400">
                    ${uploadedData.summary.metrics.avgAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {uploadedData.suggestedQuestions && uploadedData.suggestedQuestions.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Запропоновані питання:
              </h4>
              <div className="space-y-2">
                {uploadedData.suggestedQuestions.slice(0, 3).map((question, index) => (
                  <div key={index} className="text-sm text-gray-400 flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {question}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleStartChat}
          className="w-full px-6 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl font-semibold text-white shadow-lg hover:shadow-primary/50 transition-shadow"
        >
          Почати чат з ІІ
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-glass backdrop-blur-xl rounded-2xl border border-glass-border p-8 shadow-xl"
    >
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300
          ${
            isDragActive
              ? 'border-primary bg-primary/10 scale-105'
              : 'border-glass-border hover:border-primary/50 hover:bg-white/5'
          }
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-gray-300">Завантаження та аналіз файлу...</p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {isDragActive ? 'Відпустіть файл тут' : 'Завантажте звіт'}
            </h3>
            <p className="text-gray-400 mb-4">
              Перетягніть файл сюди або натисніть для вибору
            </p>

            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="flex items-center text-sm text-gray-400">
                <FileSpreadsheet className="w-4 h-4 mr-1 text-green-400" />
                CSV
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <FileText className="w-4 h-4 mr-1 text-red-400" />
                PDF
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <FileText className="w-4 h-4 mr-1 text-blue-400" />
                DOCX
              </div>
            </div>

            <p className="text-xs text-gray-500">Максимальний розмір: 10MB</p>
          </>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start"
        >
          <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Помилка</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-200">
          💡 <strong>Підказка:</strong> Завантажте CSV, PDF або DOCX звіт, згенерований в розділі "Звіти",
          щоб почати аналіз даних з допомогою ІІ.
        </p>
      </div>
    </motion.div>
  );
}

