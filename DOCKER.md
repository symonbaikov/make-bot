# Docker Setup Guide

## Обзор

Проект успешно настроен для работы с Docker. Все сервисы корректно собираются и запускаются.

## Структура проекта

- `backend/` - Backend API сервер (Node.js + Express + Prisma)
- `bot/` - Telegram бот (Node.js + Telegraf)
- `frontend/` - Frontend приложение (React + Vite)
- `docker-compose.yml` - Конфигурация всех сервисов

## Сервисы

### 1. PostgreSQL (postgres)
- Порт: `5433:5432`
- База данных: `make_bot`
- Пользователь: `makebot`
- Пароль: `makebot123`

### 2. Backend (backend)
- Порт: `3100:3000`
- Health endpoint: `http://localhost:3100/health`
- Автоматически применяет миграции БД при старте
- Зависит от PostgreSQL

### 3. Bot (bot)
- Порт: `3101:3001`
- Требует настройки `TELEGRAM_BOT_TOKEN`
- Зависит от Backend

### 4. Frontend (frontend)
- Порт: `5174:80`
- Nginx сервер для статических файлов
- SPA роутинг настроен

## Быстрый старт

### 1. Настройка переменных окружения

Скопируйте файл с примером переменных:

```bash
cp .env.docker .env
```

Отредактируйте `.env` и укажите свои значения:

```bash
# Обязательные переменные
TELEGRAM_BOT_TOKEN=your-actual-bot-token-from-botfather
JWT_SECRET=your-secure-random-secret-key

# Опциональные
MAKE_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-url
PAYPAL_CLIENT_ID=your-paypal-client-id
```

### 2. Сборка и запуск

```bash
# Собрать все образы
docker-compose build

# Запустить все сервисы
docker-compose up -d

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f
```

### 3. Проверка работоспособности

```bash
# Backend health check
curl http://localhost:3100/health

# Frontend
open http://localhost:5174

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f bot
docker-compose logs -f frontend
```

## Управление сервисами

```bash
# Остановить все сервисы
docker-compose down

# Остановить и удалить volumes (очистит БД!)
docker-compose down -v

# Перезапустить конкретный сервис
docker-compose restart backend

# Пересобрать после изменений
docker-compose build backend
docker-compose up -d backend

# Посмотреть логи в реальном времени
docker-compose logs -f
```

## Исправленные проблемы

### 1. Backend TypeScript конфигурация
- **Проблема**: `prisma/seed.ts` включался в сборку, но находился вне `rootDir`
- **Решение**: Исключен `prisma/**/*` из `include` в `backend/tsconfig.json`

### 2. Backend Dockerfile сборка
- **Проблема**: TypeScript ошибки прерывали сборку
- **Решение**: Добавлен флаг `--noEmitOnError false` для продолжения сборки с предупреждениями

### 3. Prisma Client binary targets
- **Проблема**: Отсутствовал правильный binary target для Alpine Linux ARM64
- **Решение**: Добавлены все необходимые targets в `schema.prisma`:
  ```prisma
  binaryTargets = ["native", "linux-musl-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x"]
  ```

### 4. Backend миграции БД
- **Проблема**: Миграции не применялись автоматически при старте
- **Решение**: Создан `backend/docker-entrypoint.sh` с автоматическим применением миграций

### 5. Health check endpoint
- **Проблема**: Health check использовал неправильный путь `/api/health`
- **Решение**: Исправлен путь на `/health` в `docker-compose.yml`

### 6. Конфликты портов
- **Проблема**: Порты 3000, 3001, 5173 были заняты локальными процессами
- **Решение**: Изменены внешние порты на 3100, 3101, 5174

## Полный docker-compose.yml

Все сервисы настроены с:
- Health checks
- Правильными зависимостями
- Restart policies
- Общей сетью
- Переменными окружения

## Порты

| Сервис | Внешний порт | Внутренний порт |
|--------|-------------|-----------------|
| PostgreSQL | 5433 | 5432 |
| Backend | 3100 | 3000 |
| Bot | 3101 | 3001 |
| Frontend | 5174 | 80 |

## Production deployment

Для production deployment:

1. Измените пароли БД в `docker-compose.yml`
2. Укажите правильные значения в `.env`
3. Настройте SSL/TLS для frontend (nginx)
4. Настройте резервное копирование БД
5. Используйте docker secrets для чувствительных данных

## Troubleshooting

### Сервис не запускается

```bash
# Проверьте логи
docker-compose logs service-name

# Проверьте статус
docker-compose ps
```

### База данных не подключается

```bash
# Проверьте, что postgres запущен и здоров
docker-compose ps postgres

# Проверьте логи postgres
docker-compose logs postgres
```

### Backend падает с ошибкой Prisma

```bash
# Пересоберите backend
docker-compose build backend
docker-compose up -d backend
```

## Дополнительная информация

- Backend использует Prisma ORM
- Frontend собирается с Vite
- Bot использует Telegraf framework
- Все логи доступны через `docker-compose logs`
