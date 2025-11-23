# Publications Feature - Social Media Cross-Posting

## Overview

Система для загрузки видео и автоматической публикации в выбранные социальные сети через Make.

**Make Webhook URL:** `https://hook.eu2.make.com/l6aflctg7ipab5y1gmrtai7a4pfmomu3`

---

## Table of Contents

- [Phase 1: Database Schema & Backend Setup](#phase-1-database-schema--backend-setup)
- [Phase 2: Backend API Development](#phase-2-backend-api-development)
- [Phase 3: Frontend Development](#phase-3-frontend-development)
- [Phase 4: Integration with Make](#phase-4-integration-with-make)
- [Phase 5: File Storage & Security](#phase-5-file-storage--security)
- [Phase 6: UI/UX Enhancements](#phase-6-uiux-enhancements)
- [Phase 7: Error Handling & Logging](#phase-7-error-handling--logging)
- [Phase 8: Testing & Deployment](#phase-8-testing--deployment)
- [Timeline Summary](#timeline-summary)
- [Priority Features](#priority-features)
- [Architecture Decisions](#architecture-decisions)

---

## Phase 1: Database Schema & Backend Setup

**Duration:** 0.5 дня

### 1.1 Database Schema

**Создать таблицу `publications` в `backend/prisma/schema.prisma`:**

```prisma
model Publication {
  id          String   @id @default(uuid())
  userId      String
  user        WebUser  @relation(fields: [userId], references: [id])

  // Content
  title       String
  description String   @db.Text
  videoPath   String   // Local file path
  videoUrl    String?  // Public URL после загрузки
  thumbnailPath String? // Preview image

  // Target platforms
  platforms   Json     // ["instagram", "tiktok", "facebook", "youtube"]

  // Status tracking
  status      PublicationStatus @default(PENDING)
  makeWebhookSent Boolean @default(false)
  makeResponse Json?

  // Platform-specific results
  publishResults Json? // { "instagram": { "success": true, "postId": "..." }, ... }

  // Metadata
  fileSize    Int?
  duration    Int?     // seconds
  format      String?  // mp4, mov, etc.

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  publishedAt DateTime?

  @@map("publications")
}

enum PublicationStatus {
  PENDING      // Создано, ждет отправки
  PROCESSING   // Отправлено в Make
  PUBLISHED    // Успешно опубликовано
  PARTIAL      // Опубликовано частично
  FAILED       // Ошибка
  CANCELLED    // Отменено
}
```

**Обновить модель `WebUser`:**

```prisma
model WebUser {
  id            String        @id @default(uuid())
  email         String        @unique
  passwordHash  String        @map("password_hash")
  role          Role          @default(ADMIN)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  chatSessions  ChatSession[]
  publications  Publication[] // Add this relation

  @@map("web_users")
}
```

**Запустить миграцию:**

```bash
cd backend
npx prisma migrate dev --name add_publications_table
npx prisma generate
```

### 1.2 Backend Dependencies

**Установить пакеты:**

```bash
cd backend
npm install multer fluent-ffmpeg @ffmpeg-installer/ffmpeg
npm install -D @types/multer @types/fluent-ffmpeg
```

**Описание зависимостей:**

- `multer` - загрузка файлов через multipart/form-data
- `fluent-ffmpeg` - работа с видео (thumbnail, metadata extraction)
- `@ffmpeg-installer/ffmpeg` - FFmpeg binary для Node.js

---

## Phase 2: Backend API Development

**Duration:** 1.5 дня

### 2.1 Video Upload Service

**Создать `backend/src/services/video-upload-service.ts`:**

**Функционал:**

- Валидация видео файла (размер, формат, длительность)
- Генерация thumbnail preview с помощью FFmpeg
- Извлечение metadata (duration, resolution, format, fileSize)
- Сохранение файла в `uploads/videos/`
- Генерация публичного URL для доступа

**Параметры валидации:**

- **Поддерживаемые форматы:** MP4, MOV, AVI, MKV
- **Максимальный размер:** 500MB
- **Максимальная длительность:** 10 минут (600 секунд)

**Основные методы:**

```typescript
class VideoUploadService {
  async uploadVideo(file: Express.Multer.File): Promise<UploadResult>;
  async generateThumbnail(videoPath: string): Promise<string>;
  async extractMetadata(videoPath: string): Promise<VideoMetadata>;
  async deleteVideo(videoPath: string): Promise<void>;
  validateVideo(file: Express.Multer.File): ValidationResult;
}
```

### 2.2 Publication Service

**Создать `backend/src/services/publication-service.ts`:**

**Основные методы:**

```typescript
class PublicationService {
  // CRUD operations
  async createPublication(data: CreatePublicationInput): Promise<Publication>;
  async getPublications(filters: PublicationFilters): Promise<PaginatedResult<Publication>>;
  async getPublicationById(id: string): Promise<Publication | null>;
  async updatePublication(id: string, data: UpdatePublicationInput): Promise<Publication>;
  async deletePublication(id: string): Promise<void>;

  // Status management
  async updateStatus(id: string, status: PublicationStatus): Promise<Publication>;
  async updatePublishResults(
    id: string,
    results: Record<string, PlatformResult>
  ): Promise<Publication>;
}
```

**Типы:**

```typescript
interface CreatePublicationInput {
  userId: string;
  title: string;
  description: string;
  videoPath: string;
  thumbnailPath?: string;
  platforms: Platform[];
  metadata?: VideoMetadata;
}

interface PublicationFilters {
  status?: PublicationStatus;
  platform?: Platform;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface VideoMetadata {
  duration: number;
  fileSize: number;
  format: string;
  resolution?: string;
  bitrate?: number;
}
```

### 2.3 Make Integration Service

**Создать `backend/src/services/make-publication-service.ts`:**

**Функционал:**

- Отправка webhook в Make
- Retry логика (3 попытки с exponential backoff: 1s, 5s, 15s)
- Логирование всех попыток в `actions` таблицу
- Обработка timeout и ошибок

**Формат payload для Make:**

```typescript
interface MakePublicationPayload {
  publicationId: string;
  title: string;
  description: string;
  videoUrl: string; // Public URL
  thumbnailUrl: string; // Public URL
  platforms: Platform[]; // ["instagram", "tiktok"]
  metadata: {
    duration: number; // seconds
    fileSize: number; // bytes
    format: string; // "mp4"
    resolution?: string; // "1920x1080"
  };
  createdAt: string; // ISO 8601
}
```

**Методы:**

```typescript
class MakePublicationService {
  async sendToMake(publicationId: string): Promise<void>;
  private async makeWebhookRequest(payload: MakePublicationPayload): Promise<any>;
  private async retryRequest(payload: MakePublicationPayload, attempt: number): Promise<any>;
}
```

### 2.4 API Endpoints

**Создать `backend/src/routes/publication-routes.ts`:**

```typescript
import { Router } from 'express';
import { publicationController } from '../controllers/publication-controller';
import { authMiddleware } from '../middleware/auth-middleware';
import { upload } from '../middleware/upload-middleware';
import { validateBody, validateQuery } from '../middleware/validation-middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Upload video file
router.post('/upload', upload.single('video'), publicationController.uploadVideo);

// CRUD operations
router.post('/', validateBody(createPublicationSchema), publicationController.createPublication);

router.get('/', validateQuery(listPublicationsSchema), publicationController.getPublications);

router.get('/:id', publicationController.getPublicationById);

router.put('/:id', validateBody(updatePublicationSchema), publicationController.updatePublication);

router.delete('/:id', publicationController.deletePublication);

// Publish to Make
router.post('/:id/publish', publicationController.publishToMake);

// Retry failed publication
router.post('/:id/retry', publicationController.retryPublication);

export default router;
```

**Полный список endpoints:**

| Method | Endpoint                              | Description             | Auth |
| ------ | ------------------------------------- | ----------------------- | ---- |
| POST   | `/api/admin/publications/upload`      | Upload video file       | ✓    |
| POST   | `/api/admin/publications`             | Create publication      | ✓    |
| GET    | `/api/admin/publications`             | List publications       | ✓    |
| GET    | `/api/admin/publications/:id`         | Get publication details | ✓    |
| PUT    | `/api/admin/publications/:id`         | Update publication      | ✓    |
| DELETE | `/api/admin/publications/:id`         | Delete publication      | ✓    |
| POST   | `/api/admin/publications/:id/publish` | Send to Make            | ✓    |
| POST   | `/api/admin/publications/:id/retry`   | Retry failed            | ✓    |
| POST   | `/api/webhook/publication-status`     | Callback from Make      | -    |

### 2.5 Controller

**Создать `backend/src/controllers/publication-controller.ts`:**

**Методы:**

```typescript
class PublicationController {
  // Upload video and return file info
  async uploadVideo(req: Request, res: Response): Promise<void>;

  // Create new publication
  async createPublication(req: Request, res: Response): Promise<void>;

  // Get paginated list with filters
  async getPublications(req: Request, res: Response): Promise<void>;

  // Get publication details
  async getPublicationById(req: Request, res: Response): Promise<void>;

  // Update publication (title, description, platforms)
  async updatePublication(req: Request, res: Response): Promise<void>;

  // Delete publication and associated files
  async deletePublication(req: Request, res: Response): Promise<void>;

  // Publish to Make webhook
  async publishToMake(req: Request, res: Response): Promise<void>;

  // Retry failed publication
  async retryPublication(req: Request, res: Response): Promise<void>;
}
```

**Response formats:**

```typescript
// Upload response
{
  success: true,
  data: {
    videoPath: string;
    thumbnailPath: string;
    metadata: VideoMetadata;
  }
}

// Create/Get response
{
  success: true,
  data: Publication
}

// List response
{
  success: true,
  data: {
    publications: Publication[];
    total: number;
    page: number;
    limit: number;
  }
}
```

### 2.6 Validation Schemas

**Создать `backend/src/validators/publication-validators.ts`:**

```typescript
import { z } from 'zod';

// Platforms enum
const platformEnum = z.enum(['instagram', 'tiktok', 'facebook', 'youtube']);

// Create publication
export const createPublicationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long'),
  videoPath: z.string(),
  thumbnailPath: z.string().optional(),
  platforms: z.array(platformEnum).min(1, 'Select at least one platform'),
});

// Update publication
export const updatePublicationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  platforms: z.array(platformEnum).min(1).optional(),
});

// List filters
export const listPublicationsSchema = z.object({
  status: z
    .enum(['PENDING', 'PROCESSING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'CANCELLED'])
    .optional(),
  platform: platformEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
});

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;
export type ListPublicationsInput = z.infer<typeof listPublicationsSchema>;
```

### 2.7 Upload Middleware

**Создать `backend/src/middleware/upload-middleware.ts`:**

```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/videos/temp'); // Temporary upload location
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  const allowedExts = ['.mp4', '.mov', '.avi', '.mkv'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, AVI, MKV allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});
```

---

## Phase 3: Frontend Development

**Duration:** 1 день

### 3.1 Frontend Dependencies

**Установить пакеты:**

```bash
cd frontend
npm install react-dropzone
```

### 3.2 Navigation

**Обновить `frontend/src/components/Layout.tsx`:**

Добавить новый пункт навигации:

```tsx
import { Video } from 'lucide-react';

// В массив navigation items:
{
  name: 'Публикации',
  href: '/publications',
  icon: Video,
}
```

### 3.3 Types

**Создать `frontend/src/types/publication.ts`:**

```typescript
export type PublicationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'youtube';

export interface Publication {
  id: string;
  userId: string;
  title: string;
  description: string;
  videoPath: string;
  videoUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  platforms: Platform[];
  status: PublicationStatus;
  publishResults?: Record<Platform, PlatformResult>;
  metadata?: VideoMetadata;
  makeWebhookSent: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface VideoMetadata {
  duration: number;
  fileSize: number;
  format: string;
  resolution?: string;
  bitrate?: number;
}

export interface PlatformResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  publishedAt?: string;
}

export interface CreatePublicationInput {
  title: string;
  description: string;
  videoPath: string;
  thumbnailPath?: string;
  platforms: Platform[];
}

export interface UpdatePublicationInput {
  title?: string;
  description?: string;
  platforms?: Platform[];
}

export interface PublicationListParams {
  status?: PublicationStatus;
  platform?: Platform;
  page?: number;
  limit?: number;
}

export interface UploadResult {
  videoPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
}
```

### 3.4 API Service

**Обновить `frontend/src/services/api.ts`:**

```typescript
// Publications API
publications: {
  uploadVideo: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('video', file);

    const response = await api.post<{ data: UploadResult }>(
      '/api/admin/publications/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );

    return response.data.data;
  },

  create: async (data: CreatePublicationInput): Promise<Publication> => {
    const response = await api.post<{ data: Publication }>(
      '/api/admin/publications',
      data
    );
    return response.data.data;
  },

  getAll: async (params?: PublicationListParams): Promise<{
    publications: Publication[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const response = await api.get('/api/admin/publications', { params });
    return response.data.data;
  },

  getById: async (id: string): Promise<Publication> => {
    const response = await api.get<{ data: Publication }>(
      `/api/admin/publications/${id}`
    );
    return response.data.data;
  },

  update: async (id: string, data: UpdatePublicationInput): Promise<Publication> => {
    const response = await api.put<{ data: Publication }>(
      `/api/admin/publications/${id}`,
      data
    );
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/admin/publications/${id}`);
  },

  publish: async (id: string): Promise<void> => {
    await api.post(`/api/admin/publications/${id}/publish`);
  },

  retry: async (id: string): Promise<void> => {
    await api.post(`/api/admin/publications/${id}/retry`);
  },
},
```

### 3.5 Publications Page

**Создать `frontend/src/pages/Publications.tsx`:**

**Структура:**

```tsx
export default function Publications() {
  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex justify-between items-center">
        <h1>Публикации</h1>
        <button onClick={openCreateModal}>Создать публикацию</button>
      </div>

      {/* Filters */}
      <PublicationFilters />

      {/* Publications List */}
      <PublicationsList />

      {/* Create Modal */}
      {showCreateModal && <CreatePublicationModal />}
    </div>
  );
}
```

**Основные компоненты:**

- `PublicationFilters` - фильтры по статусу, платформе, дате
- `PublicationsList` - таблица или grid с карточками публикаций
- `CreatePublicationModal` - модальное окно создания публикации

**Таблица публикаций - колонки:**

| Колонка       | Описание                     |
| ------------- | ---------------------------- |
| Preview       | Thumbnail видео              |
| Название      | Title публикации             |
| Платформы     | Badges выбранных соц сетей   |
| Статус        | Цветной badge статуса        |
| Дата создания | Форматированная дата         |
| Действия      | Кнопки (View, Retry, Delete) |

### 3.6 Create Publication Form

**Создать `frontend/src/components/publications/CreatePublicationModal.tsx`:**

**Структура формы:**

```tsx
export default function CreatePublicationModal({ isOpen, onClose }) {
  const [step, setStep] = useState<'upload' | 'details'>('upload');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {step === 'upload' ? (
        <VideoUploadZone onUploadSuccess={handleUploadSuccess} />
      ) : (
        <PublicationDetailsForm videoData={uploadedVideo} onSubmit={handleCreatePublication} />
      )}
    </Modal>
  );
}
```

**Шаг 1: Upload Video**

- Drag & drop зона
- Или кнопка "Выбрать файл"
- Progress bar загрузки
- Preview после загрузки

**Шаг 2: Details Form**

Поля:

1. **Video Preview** (readonly, показывает thumbnail)
2. **Title** (text input, обязательное, макс 200 символов)
3. **Description** (textarea, опциональное, макс 5000 символов)
4. **Platform Selection** (interactive cards, минимум 1)
5. **Actions:**
   - "Создать и опубликовать" (primary button)
   - "Сохранить как черновик" (secondary button)
   - "Назад" (вернуться к upload)
   - "Отмена"

### 3.7 Video Upload Component

**Создать `frontend/src/components/publications/VideoUploadZone.tsx`:**

```tsx
import { useDropzone } from 'react-dropzone';
import { Upload, Video, CheckCircle } from 'lucide-react';

export default function VideoUploadZone({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);

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
  });

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);

    try {
      const result = await apiService.publications.uploadVideo(file, setProgress);
      setUploadedFile(result);
      onUploadSuccess(result);
    } catch (error) {
      // Handle error
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {!uploadedFile ? (
        <div {...getRootProps()} className="dropzone">
          <input {...getInputProps()} />
          <Upload />
          <p>{isDragActive ? 'Отпустите файл здесь' : 'Перетащите видео или нажмите для выбора'}</p>
          <p className="text-sm text-gray-500">MP4, MOV, AVI, MKV (макс 500MB, до 10 минут)</p>
        </div>
      ) : (
        <div className="upload-success">
          <CheckCircle className="text-green-500" />
          <video src={uploadedFile.videoUrl} controls />
          <div>
            <p>Длительность: {formatDuration(uploadedFile.metadata.duration)}</p>
            <p>Размер: {formatFileSize(uploadedFile.metadata.fileSize)}</p>
          </div>
          <button onClick={() => setUploadedFile(null)}>Загрузить другое видео</button>
        </div>
      )}

      {uploading && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      )}
    </div>
  );
}
```

### 3.8 Platform Selector Component

**Создать `frontend/src/components/publications/PlatformSelector.tsx`:**

```tsx
import { Instagram, Music2, Facebook, Youtube } from 'lucide-react';

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'bg-black' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
];

export default function PlatformSelector({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
}) {
  const togglePlatform = (platformId: Platform) => {
    if (selected.includes(platformId)) {
      onChange(selected.filter(p => p !== platformId));
    } else {
      onChange([...selected, platformId]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {platforms.map(platform => {
        const isSelected = selected.includes(platform.id as Platform);
        const Icon = platform.icon;

        return (
          <motion.button
            key={platform.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => togglePlatform(platform.id as Platform)}
            className={`
              p-6 rounded-lg border-2 transition-all
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded ${platform.color}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium">{platform.name}</span>
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-2 flex items-center text-blue-600"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="ml-1 text-sm">Выбрано</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
```

### 3.9 Publication Details Modal

**Создать `frontend/src/components/publications/PublicationDetailsModal.tsx`:**

**Содержание:**

- Video preview с возможностью просмотра
- Все поля публикации (title, description, platforms)
- Статус публикации с цветным badge
- Результаты публикации по каждой платформе (если есть)
- Metadata (размер, длительность, формат)
- Даты создания/публикации
- Action buttons:
  - "Повторить публикацию" (если status = FAILED)
  - "Редактировать"
  - "Удалить"
  - "Скачать видео"

### 3.10 Publications List Component

**Создать `frontend/src/components/publications/PublicationsList.tsx`:**

**Features:**

- Отображение списка публикаций (таблица или grid)
- Pagination
- Sorting
- Loading states
- Empty state ("Нет публикаций")
- Error handling

**Каждая карточка/строка показывает:**

- Thumbnail preview
- Title
- Platform badges
- Status badge
- Created date
- Action buttons (View, Retry, Delete)

### 3.11 Filters Component

**Создать `frontend/src/components/publications/PublicationFilters.tsx`:**

**Фильтры:**

1. **Status** (dropdown)
   - Все
   - В ожидании
   - В обработке
   - Опубликовано
   - Частично
   - Ошибка
   - Отменено

2. **Platform** (dropdown)
   - Все
   - Instagram
   - TikTok
   - Facebook
   - YouTube

3. **Date Range** (date picker)
   - Последние 7 дней
   - Последние 30 дней
   - Последние 90 дней
   - Весь период
   - Кастомный период

4. **Search** (input)
   - Поиск по названию

### 3.12 Status Badge Component

**Создать `frontend/src/components/publications/StatusBadge.tsx`:**

**Цветовая схема:**

```tsx
const statusConfig = {
  PENDING: {
    color: 'bg-gray-100 text-gray-700',
    icon: Clock,
    label: 'В ожидании',
  },
  PROCESSING: {
    color: 'bg-blue-100 text-blue-700',
    icon: Loader,
    label: 'В обработке',
  },
  PUBLISHED: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    label: 'Опубликовано',
  },
  PARTIAL: {
    color: 'bg-orange-100 text-orange-700',
    icon: AlertCircle,
    label: 'Частично',
  },
  FAILED: {
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    label: 'Ошибка',
  },
  CANCELLED: {
    color: 'bg-gray-100 text-gray-600',
    icon: Ban,
    label: 'Отменено',
  },
};
```

---

## Phase 4: Integration with Make

**Duration:** 0.5 дня

### 4.1 Webhook Payload Format

**При отправке в Make (POST запрос на webhook URL):**

```json
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My awesome video",
  "description": "Check out this amazing content! #viral #content",
  "videoUrl": "https://your-domain.com/uploads/videos/video_123.mp4",
  "thumbnailUrl": "https://your-domain.com/uploads/videos/thumb_123.jpg",
  "platforms": ["instagram", "tiktok"],
  "metadata": {
    "duration": 45,
    "fileSize": 15728640,
    "format": "mp4",
    "resolution": "1920x1080"
  },
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### 4.2 Make Scenario Structure

**Предлагаемая структура сценария в Make:**

1. **Webhook Trigger** - получение данных от нашего приложения
2. **Router** - разделение по платформам
3. **Platform Modules:**
   - Instagram Business API
   - TikTok API
   - Facebook Pages API
   - YouTube API
4. **Aggregator** - сбор результатов со всех платформ
5. **HTTP Response** - отправка результатов обратно (опционально)

### 4.3 Callback from Make (Optional)

**Если нужен обратный callback от Make для обновления статусов:**

**Endpoint:** `POST /api/webhook/publication-status`

**Payload от Make:**

```json
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PUBLISHED",
  "results": {
    "instagram": {
      "success": true,
      "postId": "instagram_post_12345",
      "url": "https://instagram.com/p/AbCdEfG/",
      "publishedAt": "2025-01-15T10:35:00.000Z"
    },
    "tiktok": {
      "success": true,
      "postId": "tiktok_video_67890",
      "url": "https://tiktok.com/@user/video/67890",
      "publishedAt": "2025-01-15T10:35:30.000Z"
    }
  }
}
```

**Или если частично опубликовано:**

```json
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PARTIAL",
  "results": {
    "instagram": {
      "success": true,
      "postId": "instagram_post_12345",
      "url": "https://instagram.com/p/AbCdEfG/",
      "publishedAt": "2025-01-15T10:35:00.000Z"
    },
    "tiktok": {
      "success": false,
      "error": "Video duration too long for TikTok (max 60s)"
    }
  }
}
```

**Обработка callback:**

```typescript
// backend/src/controllers/webhook-controller.ts
async handlePublicationStatus(req: Request, res: Response) {
  const { publicationId, status, results } = req.body;

  // Update publication
  await publicationService.updateStatus(publicationId, status);
  await publicationService.updatePublishResults(publicationId, results);

  // Log action
  await actionService.logAction({
    type: 'publication_status_updated',
    ref: publicationId,
    payload: { status, results },
  });

  sendSuccess(res, { message: 'Status updated' });
}
```

### 4.4 Error Handling in Make

**Make сценарий должен обрабатывать:**

- API rate limits
- Invalid credentials
- Platform-specific errors (file too large, wrong format, etc.)
- Network timeouts
- Возвращать детальные ошибки для каждой платформы

---

## Phase 5: File Storage & Security

**Duration:** 0.5 дня

### 5.1 File Storage Structure

**Локальное хранилище для MVP:**

```
backend/
  uploads/
    videos/
      temp/           # Временные файлы при загрузке
      published/      # Готовые к публикации
    thumbnails/       # Превью
```

**Naming convention:**

```
{uuid}_{timestamp}.{ext}
```

Example: `550e8400-e29b-41d4-a716-446655440000_1705315800000.mp4`

**Очистка:**

- Автоматически удалять temp файлы старше 24 часов
- Удалять файлы при удалении публикации
- Опциональный архив старых публикаций

### 5.2 Public URL Generation

**Static files serving (Express):**

```typescript
// backend/src/index.ts
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

**URL format:**

```
https://your-domain.com/uploads/videos/published/video_123.mp4
https://your-domain.com/uploads/thumbnails/thumb_123.jpg
```

**В production - использовать:**

- Nginx для раздачи static files
- CDN для ускорения (Cloudflare, AWS CloudFront)
- Или полностью перейти на S3 + CloudFront

### 5.3 Security Measures

**File Upload Validation:**

```typescript
// Проверка MIME type
const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

// Проверка расширения
const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv'];

// Проверка размера
const maxFileSize = 500 * 1024 * 1024; // 500MB

// Проверка длительности (через FFmpeg)
const maxDuration = 600; // 10 минут
```

**File Access Control:**

- Публичный доступ только к опубликованным видео
- Temp файлы - только для authenticated пользователей
- Проверка прав доступа перед удалением

**Security Headers:**

```typescript
// helmet.js configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'media-src': ["'self'"],
      },
    },
  })
);
```

**Rate Limiting:**

```typescript
// Upload rate limit
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 uploads per 15 min
  message: 'Too many uploads, please try again later',
});

app.use('/api/admin/publications/upload', uploadLimiter);
```

### 5.4 File Sanitization

**Filename sanitization:**

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/_{2,}/g, '_') // Remove duplicate underscores
    .toLowerCase();
}
```

**Prevent path traversal:**

```typescript
const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
```

### 5.5 Backup & Disaster Recovery

**Recommendations:**

- Регулярные бэкапы uploads директории
- Версионирование файлов (опционально)
- Мониторинг дискового пространства
- Alerts при низком свободном месте

---

## Phase 6: UI/UX Enhancements

**Duration:** 0.5 дня

### 6.1 Status Visualization

**Status badges с анимацией:**

```tsx
// PROCESSING status - animated
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
>
  <Loader className="w-4 h-4" />
</motion.div>
```

**Progress indicators:**

- Upload progress bar
- Processing spinner
- Success checkmark animation

### 6.2 Platform Icons & Branding

**Используем lucide-react icons:**

```tsx
import { Instagram, Music2, Facebook, Youtube } from 'lucide-react';
```

**Или custom SVG icons для точного соответствия брендам.**

**Цветовая схема:**

| Platform  | Primary Color                     | Icon      |
| --------- | --------------------------------- | --------- |
| Instagram | `#E4405F` (gradient: pink-purple) | Instagram |
| TikTok    | `#000000`                         | Music2    |
| Facebook  | `#1877F2`                         | Facebook  |
| YouTube   | `#FF0000`                         | Youtube   |

### 6.3 Animations & Transitions

**Framer Motion animations:**

1. **Modal entrance:**

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
>
  {/* Modal content */}
</motion.div>
```

2. **List items stagger:**

```tsx
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }}
>
  {publications.map(pub => (
    <motion.div variants={itemVariants} key={pub.id}>
      {/* Publication card */}
    </motion.div>
  ))}
</motion.div>
```

3. **Upload success:**

```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 300 }}
>
  <CheckCircle className="text-green-500" />
</motion.div>
```

### 6.4 Responsive Design

**Breakpoints:**

- Mobile: `< 640px` - single column, stacked layout
- Tablet: `640px - 1024px` - 2 columns for platform selector
- Desktop: `> 1024px` - full layout

**Mobile optimizations:**

- Touch-friendly buttons (min 44x44px)
- Swipe gestures для navigation
- Compact table view или card view
- Bottom sheet для actions

### 6.5 Loading States

**Skeleton loaders:**

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-48 bg-gray-200 rounded" />
  <div className="h-4 bg-gray-200 rounded w-3/4" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>
```

**Spinner для async actions:**

```tsx
<Loader className="w-5 h-5 animate-spin" />
```

### 6.6 Empty States

**Когда нет публикаций:**

```tsx
<div className="text-center py-12">
  <Video className="w-16 h-16 mx-auto text-gray-400" />
  <h3 className="mt-4 text-lg font-medium">Нет публикаций</h3>
  <p className="mt-2 text-gray-500">Создайте свою первую публикацию для кросс-постинга</p>
  <button onClick={openCreateModal} className="mt-4">
    Создать публикацию
  </button>
</div>
```

### 6.7 Toast Notifications

**Success/Error messages:**

```tsx
// Success
toast.success('Публикация создана и отправлена в Make!');

// Error
toast.error('Не удалось загрузить видео. Попробуйте снова.');

// Info
toast.info('Публикация обрабатывается...');

// Warning
toast.warning('Не все платформы успешно опубликовали контент');
```

### 6.8 Confirmation Dialogs

**Перед удалением:**

```tsx
<ConfirmDialog
  title="Удалить публикацию?"
  message="Это действие нельзя отменить. Видео будет удалено безвозвратно."
  confirmText="Удалить"
  cancelText="Отмена"
  onConfirm={handleDelete}
  variant="danger"
/>
```

---

## Phase 7: Error Handling & Logging

**Duration:** 0.5 дня

### 7.1 Backend Error Handling

**Типы ошибок:**

1. **File Upload Errors:**
   - File too large
   - Invalid format
   - Upload interrupted
   - Disk space full

2. **Video Processing Errors:**
   - Invalid video codec
   - Cannot extract metadata
   - Thumbnail generation failed
   - Duration exceeds limit

3. **Make Webhook Errors:**
   - Network timeout
   - 4xx/5xx responses
   - Invalid payload

4. **Database Errors:**
   - Connection failed
   - Constraint violations
   - Query timeout

**Error response format:**

```typescript
{
  success: false,
  error: {
    message: 'User-friendly error message',
    code: 'VIDEO_TOO_LARGE',
    details?: any, // Optional technical details
  }
}
```

**Error codes:**

```typescript
enum PublicationErrorCode {
  // Upload errors
  VIDEO_TOO_LARGE = 'VIDEO_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // Processing errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  METADATA_EXTRACTION_FAILED = 'METADATA_EXTRACTION_FAILED',
  THUMBNAIL_GENERATION_FAILED = 'THUMBNAIL_GENERATION_FAILED',

  // Make webhook errors
  WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',

  // Business logic errors
  PUBLICATION_NOT_FOUND = 'PUBLICATION_NOT_FOUND',
  ALREADY_PUBLISHED = 'ALREADY_PUBLISHED',
  NO_PLATFORMS_SELECTED = 'NO_PLATFORMS_SELECTED',
}
```

### 7.2 Retry Logic

**Exponential backoff для Make webhook:**

```typescript
class MakePublicationService {
  private async retryRequest(payload: MakePublicationPayload, attempt: number = 1): Promise<any> {
    const maxAttempts = 3;
    const delays = [1000, 5000, 15000]; // 1s, 5s, 15s

    try {
      return await this.makeWebhookRequest(payload);
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error; // Max retries exceeded
      }

      logger.warn(`Retry attempt ${attempt} for publication ${payload.publicationId}`);
      await this.delay(delays[attempt - 1]);

      return this.retryRequest(payload, attempt + 1);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 7.3 Frontend Error Handling

**User-friendly error messages:**

```typescript
const errorMessages: Record<string, string> = {
  VIDEO_TOO_LARGE: 'Файл слишком большой. Максимальный размер: 500MB',
  INVALID_FORMAT: 'Неподдерживаемый формат. Используйте MP4, MOV, AVI или MKV',
  UPLOAD_FAILED: 'Ошибка загрузки. Проверьте интернет-соединение и попробуйте снова',
  PROCESSING_FAILED: 'Не удалось обработать видео. Возможно, файл поврежден',
  WEBHOOK_TIMEOUT: 'Не удалось отправить в Make. Публикация будет повторена автоматически',
  WEBHOOK_FAILED: 'Ошибка при отправке в Make. Попробуйте повторить позже',
  PUBLICATION_NOT_FOUND: 'Публикация не найдена',
  ALREADY_PUBLISHED: 'Эта публикация уже опубликована',
  NO_PLATFORMS_SELECTED: 'Выберите хотя бы одну платформу для публикации',
};
```

**Error boundary для React:**

```tsx
class PublicationErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Publication component error:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
```

### 7.4 Logging Strategy

**Что логировать:**

| Event                | Level | Payload                                         |
| -------------------- | ----- | ----------------------------------------------- |
| Video uploaded       | INFO  | `{ publicationId, fileSize, duration, format }` |
| Publication created  | INFO  | `{ publicationId, platforms, userId }`          |
| Sent to Make         | INFO  | `{ publicationId, webhookUrl, timestamp }`      |
| Make webhook success | INFO  | `{ publicationId, response }`                   |
| Make webhook failed  | ERROR | `{ publicationId, error, attempt }`             |
| Publication deleted  | INFO  | `{ publicationId, userId }`                     |
| Processing error     | ERROR | `{ publicationId, error, stage }`               |

**Log format (Winston):**

```typescript
logger.info('Video uploaded successfully', {
  publicationId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user_123',
  fileSize: 15728640,
  duration: 45,
  format: 'mp4',
  timestamp: new Date().toISOString(),
});
```

**Actions table logging:**

```typescript
await actionService.logAction({
  type: 'publication_created',
  ref: publicationId,
  payload: {
    title,
    platforms,
    status: 'PENDING',
  },
});

await actionService.logAction({
  type: 'publication_sent_to_make',
  ref: publicationId,
  payload: {
    webhookUrl: process.env.MAKE_PUBLICATION_WEBHOOK_URL,
    attempt: 1,
  },
});

await actionService.logAction({
  type: 'publication_failed',
  ref: publicationId,
  payload: {
    error: error.message,
    code: 'WEBHOOK_TIMEOUT',
  },
});
```

### 7.5 Monitoring & Alerts

**Metrics to monitor:**

- Upload success rate
- Average upload time
- Make webhook success rate
- Publication success rate by platform
- Disk space usage
- Error rate

**Alerts (optional для Phase 1):**

- Disk space < 10% free
- Error rate > 10% in last hour
- Make webhook failing consistently

---

## Phase 8: Testing & Deployment

**Duration:** 0.5 дня

### 8.1 Unit Tests

**Backend services to test:**

```typescript
// video-upload-service.test.ts
describe('VideoUploadService', () => {
  it('should validate video file format', async () => {
    // Test
  });

  it('should reject files larger than 500MB', async () => {
    // Test
  });

  it('should extract video metadata', async () => {
    // Test
  });

  it('should generate thumbnail', async () => {
    // Test
  });
});

// publication-service.test.ts
describe('PublicationService', () => {
  it('should create publication with valid data', async () => {
    // Test
  });

  it('should filter publications by status', async () => {
    // Test
  });

  it('should update publication status', async () => {
    // Test
  });
});

// make-publication-service.test.ts
describe('MakePublicationService', () => {
  it('should send webhook to Make', async () => {
    // Test
  });

  it('should retry on failure', async () => {
    // Test with max 3 retries
  });

  it('should log all attempts', async () => {
    // Test
  });
});
```

### 8.2 Integration Tests

**API endpoints to test:**

```typescript
describe('Publication API', () => {
  describe('POST /api/admin/publications/upload', () => {
    it('should upload video successfully', async () => {
      // Test
    });

    it('should return 400 for invalid file', async () => {
      // Test
    });

    it('should require authentication', async () => {
      // Test
    });
  });

  describe('POST /api/admin/publications', () => {
    it('should create publication', async () => {
      // Test
    });

    it('should validate required fields', async () => {
      // Test
    });
  });

  describe('POST /api/admin/publications/:id/publish', () => {
    it('should send to Make webhook', async () => {
      // Mock Make webhook
    });

    it('should update status to PROCESSING', async () => {
      // Test
    });
  });
});
```

### 8.3 E2E Tests

**User flow test:**

```typescript
describe('Publication E2E Flow', () => {
  it('should complete full publication workflow', async () => {
    // 1. Login
    await loginAsAdmin();

    // 2. Navigate to Publications
    await page.goto('/publications');

    // 3. Click "Create Publication"
    await page.click('[data-testid="create-publication-btn"]');

    // 4. Upload video
    await page.setInputFiles('input[type="file"]', 'test-video.mp4');
    await page.waitForSelector('[data-testid="upload-success"]');

    // 5. Fill form
    await page.fill('input[name="title"]', 'Test Publication');
    await page.fill('textarea[name="description"]', 'Test description');

    // 6. Select platforms
    await page.click('[data-testid="platform-instagram"]');
    await page.click('[data-testid="platform-tiktok"]');

    // 7. Submit
    await page.click('[data-testid="submit-btn"]');

    // 8. Verify success
    await page.waitForSelector('[data-testid="success-toast"]');

    // 9. Verify publication appears in list
    await expect(page.locator('text=Test Publication')).toBeVisible();
  });
});
```

### 8.4 Environment Variables

**Backend `.env`:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/makebot

# JWT
JWT_SECRET=your-secret-key

# Make Webhook
MAKE_PUBLICATION_WEBHOOK_URL=https://hook.eu2.make.com/l6aflctg7ipab5y1gmrtai7a4pfmomu3

# File Upload Settings
MAX_VIDEO_SIZE_MB=500
MAX_VIDEO_DURATION_SECONDS=600
ALLOWED_VIDEO_FORMATS=mp4,mov,avi,mkv

# Storage
UPLOADS_DIR=./uploads
VIDEO_URL_BASE=https://your-domain.com/uploads/videos
THUMBNAIL_URL_BASE=https://your-domain.com/uploads/thumbnails

# FFmpeg (optional, if not using @ffmpeg-installer)
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

**Frontend `.env`:**

```env
VITE_API_URL=http://localhost:3000
```

### 8.5 Deployment Checklist

#### Backend Deployment

- [ ] Install FFmpeg on server:

  ```bash
  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install ffmpeg

  # macOS
  brew install ffmpeg
  ```

- [ ] Create uploads directories:

  ```bash
  mkdir -p uploads/videos/temp
  mkdir -p uploads/videos/published
  mkdir -p uploads/thumbnails
  chmod 755 uploads
  ```

- [ ] Run database migrations:

  ```bash
  cd backend
  npx prisma migrate deploy
  ```

- [ ] Set environment variables in hosting platform

- [ ] Configure static files serving (Nginx):

  ```nginx
  location /uploads {
    alias /var/www/makebot/backend/uploads;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  ```

- [ ] Set up cron job for temp files cleanup:
  ```bash
  # Run daily at 3 AM
  0 3 * * * find /var/www/makebot/backend/uploads/videos/temp -mtime +1 -delete
  ```

#### Frontend Deployment

- [ ] Update `VITE_API_URL` for production
- [ ] Build frontend: `npm run build`
- [ ] Deploy to Vercel/Netlify
- [ ] Configure redirects for SPA routing

#### Make Configuration

- [ ] Test webhook URL is accessible
- [ ] Configure Make scenario:
  1. Webhook trigger
  2. Router by platform
  3. Platform API modules
  4. Aggregator
  5. (Optional) Callback to our app

- [ ] Test with sample payload
- [ ] Set up error handling in Make
- [ ] Configure notifications for failures

#### Security Checks

- [ ] HTTPS enabled
- [ ] CORS configured properly
- [ ] Rate limiting active
- [ ] File upload limits enforced
- [ ] JWT authentication working
- [ ] Environment variables secured

#### Monitoring Setup

- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Disk space alerts
- [ ] Log aggregation
- [ ] Performance monitoring

### 8.6 Post-Deployment Testing

**Test checklist:**

1. [ ] Upload video (< 50MB)
2. [ ] Upload video (> 500MB) - should fail
3. [ ] Upload invalid format - should fail
4. [ ] Create publication with all platforms
5. [ ] Create publication with one platform
6. [ ] Publish to Make - verify webhook received
7. [ ] Check publication status updates
8. [ ] Test retry functionality
9. [ ] Test delete publication
10. [ ] Test filters and search
11. [ ] Test pagination
12. [ ] Mobile responsiveness
13. [ ] Check logs in actions table

---

## Timeline Summary

| Phase       | Task                            | Duration    | Dependencies |
| ----------- | ------------------------------- | ----------- | ------------ |
| **Phase 1** | Database Schema & Backend Setup | 0.5 дня     | -            |
| **Phase 2** | Backend API Development         | 1.5 дня     | Phase 1      |
| **Phase 3** | Frontend Development            | 1 день      | Phase 2      |
| **Phase 4** | Make Integration                | 0.5 дня     | Phase 2      |
| **Phase 5** | File Storage & Security         | 0.5 дня     | Phase 2      |
| **Phase 6** | UI/UX Enhancements              | 0.5 дня     | Phase 3      |
| **Phase 7** | Error Handling & Logging        | 0.5 дня     | Phase 2, 3   |
| **Phase 8** | Testing & Deployment            | 0.5 дня     | All phases   |
| **Total**   |                                 | **~5 дней** |              |

**Detailed breakdown:**

- **Day 1:** Phase 1 (0.5d) + Phase 2 start (0.5d)
- **Day 2:** Phase 2 completion (1d)
- **Day 3:** Phase 3 (1d)
- **Day 4:** Phase 4 (0.5d) + Phase 5 (0.5d)
- **Day 5:** Phase 6 (0.5d) + Phase 7 (0.5d)
- **Day 6:** Phase 8 (0.5d) + buffer time

---

## Priority Features

### ✅ Must Have (MVP - Phase 1)

**Core Functionality:**

- [x] Upload видео (MP4, MOV, AVI, MKV)
- [x] Basic validation (size, format)
- [x] Platform selection (Instagram, TikTok, Facebook, YouTube)
- [x] Create publication
- [x] Send to Make webhook
- [x] List publications with status
- [x] Delete publication
- [x] Basic error handling

**UI/UX:**

- [x] Publications page with list
- [x] Create publication modal
- [x] Video upload zone (drag & drop)
- [x] Platform selector
- [x] Status badges

### 🎯 Should Have (Phase 2 - Future Enhancements)

**Advanced Features:**

- [ ] Thumbnail preview generation
- [ ] Video metadata extraction (duration, resolution)
- [ ] Retry failed publications manually
- [ ] Callback from Make for status updates
- [ ] Filters (status, platform, date)
- [ ] Search by title
- [ ] Pagination

**UI/UX:**

- [ ] Video preview in details modal
- [ ] Platform-specific publish results
- [ ] Loading states and animations
- [ ] Toast notifications
- [ ] Responsive design

### 💡 Nice to Have (Phase 3 - Advanced Features)

**Future Enhancements:**

- [ ] Schedule публикации (отложенный постинг)
- [ ] Bulk upload (несколько видео за раз)
- [ ] Template descriptions с плейсхолдерами
- [ ] Analytics по публикациям (views, engagement)
- [ ] Preview как пост будет выглядеть в каждой соц сети
- [ ] Crop видео под разные форматы (Stories, Reels, Square)
- [ ] Hashtag suggestions
- [ ] Best time to post recommendations
- [ ] Auto-retry failed publications
- [ ] Publication drafts
- [ ] Collaborative editing
- [ ] S3/Cloud storage integration
- [ ] Video transcoding для оптимизации
- [ ] Multiple language support
- [ ] Team permissions и roles

---

## Architecture Decisions

### File Storage Strategy

**Decision:** Локальное хранилище для MVP

**Reasons:**

- ✅ Простота реализации
- ✅ Нет дополнительных costs
- ✅ Быстрый старт
- ✅ Легко мигрировать на S3 позже

**Future:** AWS S3 + CloudFront CDN

**Benefits:**

- Масштабируемость
- Автоматические бэкапы
- Geo-distribution
- Lower server costs

### Video Processing Approach

**Decision:** FFmpeg через fluent-ffmpeg

**Reasons:**

- ✅ Industry standard для video processing
- ✅ Богатый функционал (metadata, thumbnails, transcoding)
- ✅ Cross-platform
- ✅ Активное community

**Alternative considered:** Cloud-based video APIs (Cloudinary, Mux)

- ❌ Additional costs
- ❌ Vendor lock-in
- ✅ But better for scaling in future

### Make Integration Pattern

**Decision:** Webhook + Optional Callback

**Reasons:**

- ✅ Асинхронная обработка
- ✅ Make занимается публикацией
- ✅ Наше приложение - только orchestration
- ✅ Легко добавить новые платформы в Make
- ✅ Разделение ответственности

**Flow:**

```
Our App → Make Webhook → Platform APIs → (Optional) Callback → Our App
```

**Alternative considered:** Direct platform API integration

- ❌ Сложнее реализация
- ❌ Нужно поддерживать каждую API отдельно
- ❌ OAuth flows для каждой платформы
- ✅ Больший контроль
- ✅ Но Make проще для MVP

### Database Schema Design

**Decision:** Single `publications` table с JSON fields для гибкости

**Reasons:**

- ✅ Простота MVP
- ✅ JSON для `platforms` array - гибко
- ✅ JSON для `publishResults` - разная структура для каждой платформы
- ✅ Easy to extend

**Alternative considered:** Normalized tables (publications, publication_platforms, publication_results)

- ✅ Better для сложных queries
- ✅ Referential integrity
- ❌ Overkill для MVP
- ❌ Можно мигрировать позже если нужно

### Authentication Strategy

**Decision:** Reuse existing JWT auth система

**Reasons:**

- ✅ Уже работает
- ✅ Consistent UX
- ✅ No additional setup

**Access Control:**

- All authenticated users can create publications
- Future: Role-based permissions (admin, editor, viewer)

---

## Tech Stack Summary

### Backend

| Component        | Technology             | Purpose                 |
| ---------------- | ---------------------- | ----------------------- |
| Runtime          | Node.js 18+            | Server runtime          |
| Framework        | Express.js             | Web framework           |
| Database         | PostgreSQL 14+         | Data persistence        |
| ORM              | Prisma                 | Database access         |
| File Upload      | Multer                 | Multipart form handling |
| Video Processing | FFmpeg + fluent-ffmpeg | Metadata, thumbnails    |
| Validation       | Zod                    | Input validation        |
| HTTP Client      | Axios                  | Make webhook calls      |
| Logger           | Winston/Pino           | Logging                 |

### Frontend

| Component     | Technology      | Purpose           |
| ------------- | --------------- | ----------------- |
| Framework     | React 18+       | UI library        |
| Build Tool    | Vite            | Fast dev & build  |
| Routing       | React Router    | SPA routing       |
| State         | React Query     | Server state      |
| Forms         | React Hook Form | Form handling     |
| Validation    | Zod             | Schema validation |
| UI Library    | Tailwind CSS    | Styling           |
| Animations    | Framer Motion   | UI animations     |
| File Upload   | react-dropzone  | Drag & drop       |
| Icons         | Lucide React    | Icon library      |
| Notifications | react-toastify  | Toast messages    |

### DevOps

| Component          | Technology     | Purpose        |
| ------------------ | -------------- | -------------- |
| Containerization   | Docker         | Deployment     |
| CI/CD              | GitHub Actions | Automation     |
| Hosting (Backend)  | Render/Railway | API server     |
| Hosting (Frontend) | Vercel/Netlify | Static hosting |
| Database Hosting   | Supabase/Neon  | PostgreSQL     |
| Monitoring         | Sentry         | Error tracking |

---

## API Reference

### Publications Endpoints

#### Upload Video

```http
POST /api/admin/publications/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  video: File
```

**Response:**

```json
{
  "success": true,
  "data": {
    "videoPath": "550e8400-e29b-41d4-a716-446655440000_1705315800000.mp4",
    "thumbnailPath": "550e8400-e29b-41d4-a716-446655440000_1705315800000.jpg",
    "metadata": {
      "duration": 45,
      "fileSize": 15728640,
      "format": "mp4",
      "resolution": "1920x1080"
    }
  }
}
```

#### Create Publication

```http
POST /api/admin/publications
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "title": "My Video",
  "description": "Check this out!",
  "videoPath": "path/to/video.mp4",
  "thumbnailPath": "path/to/thumb.jpg",
  "platforms": ["instagram", "tiktok"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_123",
    "title": "My Video",
    "description": "Check this out!",
    "videoPath": "path/to/video.mp4",
    "videoUrl": "https://domain.com/uploads/videos/video.mp4",
    "platforms": ["instagram", "tiktok"],
    "status": "PENDING",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

#### List Publications

```http
GET /api/admin/publications?status=PUBLISHED&platform=instagram&page=1&limit=20
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "publications": [
      /* array of publications */
    ],
    "total": 45,
    "page": 1,
    "limit": 20
  }
}
```

#### Get Publication Details

```http
GET /api/admin/publications/:id
Authorization: Bearer <token>
```

#### Update Publication

```http
PUT /api/admin/publications/:id
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "title": "Updated Title",
  "platforms": ["instagram", "tiktok", "facebook"]
}
```

#### Delete Publication

```http
DELETE /api/admin/publications/:id
Authorization: Bearer <token>
```

#### Publish to Make

```http
POST /api/admin/publications/:id/publish
Authorization: Bearer <token>
```

#### Retry Publication

```http
POST /api/admin/publications/:id/retry
Authorization: Bearer <token>
```

### Webhook Endpoints

#### Publication Status Callback (from Make)

```http
POST /api/webhook/publication-status
Content-Type: application/json

Body:
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PUBLISHED",
  "results": {
    "instagram": {
      "success": true,
      "postId": "instagram_post_12345",
      "url": "https://instagram.com/p/AbCdEfG/"
    },
    "tiktok": {
      "success": true,
      "postId": "tiktok_video_67890",
      "url": "https://tiktok.com/@user/video/67890"
    }
  }
}
```

---

## Make Webhook Payload Reference

### Outgoing Payload (Our App → Make)

```json
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My awesome video",
  "description": "Check out this content! #viral #trending",
  "videoUrl": "https://your-domain.com/uploads/videos/published/video_123.mp4",
  "thumbnailUrl": "https://your-domain.com/uploads/thumbnails/thumb_123.jpg",
  "platforms": ["instagram", "tiktok", "facebook"],
  "metadata": {
    "duration": 45,
    "fileSize": 15728640,
    "format": "mp4",
    "resolution": "1920x1080",
    "bitrate": 2500000
  },
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

### Incoming Callback (Make → Our App)

```json
{
  "publicationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PUBLISHED" | "PARTIAL" | "FAILED",
  "results": {
    "instagram": {
      "success": true,
      "postId": "instagram_post_id",
      "url": "https://instagram.com/p/AbCdEfG/",
      "publishedAt": "2025-01-15T10:35:00.000Z"
    },
    "tiktok": {
      "success": false,
      "error": "Video duration exceeds TikTok limit (max 60s)"
    }
  }
}
```

---

## Next Steps

### Immediate Actions

1. **Review Plan** ✅
   - Read through document
   - Clarify any questions
   - Approve or request changes

2. **Setup Development Environment**
   - Install FFmpeg locally
   - Create test video files
   - Configure environment variables

3. **Start Phase 1**
   - Create database schema
   - Run migrations
   - Install backend dependencies

### Implementation Order

**Week 1:**

- Days 1-2: Backend (Phases 1-2)
- Days 3-4: Frontend (Phase 3)
- Day 5: Integration & Testing (Phases 4-8)

**Milestones:**

- ✅ Day 1: Database ready, backend structure created
- ✅ Day 2: All API endpoints working
- ✅ Day 3: Frontend UI complete
- ✅ Day 4: Make integration working
- ✅ Day 5: Deployed to production

---

## Questions & Considerations

### Questions to Clarify

1. **Platform Credentials:**
   - Нужно ли нам хранить API credentials для соц сетей?
   - Или все credentials будут в Make?

2. **Multi-user:**
   - Будет ли несколько администраторов использовать систему?
   - Нужны ли отдельные аккаунты соц сетей для разных пользователей?

3. **Content Moderation:**
   - Нужна ли модерация контента перед публикацией?
   - Approval flow?

4. **Scheduling:**
   - Нужен ли отложенный постинг в MVP?
   - Или это для Phase 2?

5. **Analytics:**
   - Будут ли данные по просмотрам/лайкам возвращаться из Make?
   - Нужно ли хранить engagement метрики?

### Technical Considerations

1. **FFmpeg Installation:**
   - Убедиться что FFmpeg установлен на production сервере
   - Или использовать `@ffmpeg-installer/ffmpeg` npm пакет

2. **Video Storage:**
   - Как долго хранить видео?
   - Нужна ли автоматическая очистка старых файлов?

3. **Concurrent Uploads:**
   - Лимит на количество одновременных загрузок?
   - Queue system для обработки?

4. **Make Scenario:**
   - Кто будет создавать Make сценарий?
   - Нужна ли помощь с настройкой?

---

## Success Metrics

### Technical Metrics

- ✅ Upload success rate > 95%
- ✅ Average upload time < 30s (for 100MB file)
- ✅ Make webhook success rate > 98%
- ✅ Publication success rate > 90%
- ✅ API response time < 500ms (95th percentile)
- ✅ Zero data loss

### Business Metrics

- ✅ Time to publish reduced from manual process
- ✅ Number of platforms published simultaneously
- ✅ User satisfaction with UI/UX
- ✅ Error rate < 5%

---

## Glossary

| Term              | Definition                                        |
| ----------------- | ------------------------------------------------- |
| **Publication**   | Единица контента для публикации в соц сетях       |
| **Platform**      | Социальная сеть (Instagram, TikTok, etc.)         |
| **Cross-posting** | Публикация одного контента в несколько соц сетей  |
| **Make Webhook**  | HTTP endpoint для отправки данных в Make          |
| **Thumbnail**     | Превью-изображение видео                          |
| **Metadata**      | Информация о видео (размер, длительность, формат) |
| **FFmpeg**        | Инструмент для обработки видео                    |
| **Multer**        | Middleware для загрузки файлов в Express          |

---

## Contact & Support

**Questions about this plan?**

- Создай issue или напиши в чат

**Need help with implementation?**

- Я готов помочь на каждом этапе

**Want to modify the plan?**

- План гибкий, можем адаптировать под нужды

---

**Ready to start? Let's build this! 🚀**
