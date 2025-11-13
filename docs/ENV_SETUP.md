# Environment Variables Setup Guide

## 📁 Расположение .env файлов

Каждый сервис имеет свой собственный `.env` файл в своей папке:

```
make-bot/
├── backend/
│   └── .env          # Переменные для Backend API
├── bot/
│   └── .env          # Переменные для Telegram Bot
└── frontend/
    └── .env          # Переменные для Frontend
```

---

## 🔧 Backend (.env)

**Расположение:** `backend/.env`

### Обязательные переменные:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# CORS Configuration
CORS_ORIGIN="http://localhost:5173"

# Make Integration
MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-url"

# Telegram Bot Configuration
TELEGRAM_BOT_USERNAME="your_bot_username"
```

### Описание переменных:

- **PORT** - Порт для Backend API (по умолчанию: 3000)
- **NODE_ENV** - Окружение (`development` | `production`)
- **LOG_LEVEL** - Уровень логирования (`error` | `warn` | `info` | `debug`)
- **DATABASE_URL** - URL подключения к PostgreSQL
  - Формат: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
  - Для Docker Compose: `postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public`
- **JWT_SECRET** - Секретный ключ для JWT токенов (обязательно измените в production!)
- **JWT_EXPIRES_IN** - Время жизни JWT токена (по умолчанию: 7d)
- **CORS_ORIGIN** - URL фронтенда для CORS (по умолчанию: http://localhost:5173)
- **MAKE_WEBHOOK_URL** - Webhook URL из Make сценария (получите после настройки Make)
- **TELEGRAM_BOT_USERNAME** - Username вашего Telegram бота (без @)

---

## 🤖 Bot (.env)

**Расположение:** `bot/.env`

### Обязательные переменные:

```env
# Environment
NODE_ENV=development

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="your-telegram-bot-token-from-botfather"

# Backend API URL
API_URL="http://localhost:3000"

# PayPal Configuration (Optional)
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_MODE="sandbox"
```

### Описание переменных:

- **NODE_ENV** - Окружение (`development` | `production`)
- **TELEGRAM_BOT_TOKEN** - Токен бота от @BotFather (обязательно!)
- **API_URL** - URL Backend API (по умолчанию: http://localhost:3000)
- **PAYPAL_CLIENT_ID** - PayPal Client ID (опционально, для генерации PayPal ссылок)
- **PAYPAL_MODE** - Режим PayPal (`sandbox` | `live`)

---

## 🎨 Frontend (.env)

**Расположение:** `frontend/.env`

### Обязательные переменные:

```env
# Backend API URL
VITE_API_URL="http://localhost:3000"
```

### Описание переменных:

- **VITE_API_URL** - URL Backend API (по умолчанию: http://localhost:3000)
  - ⚠️ Важно: В Vite переменные окружения должны начинаться с `VITE_`

---

## 🚀 Быстрый старт

### 1. Создайте .env файлы из примеров:

```bash
# Backend
cp backend/.env.example backend/.env

# Bot
cp bot/.env.example bot/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Настройте переменные:

#### Backend (.env):
1. **DATABASE_URL** - Используйте значения из `docker-compose.yml` или вашей БД
2. **JWT_SECRET** - Сгенерируйте случайный ключ (минимум 32 символа)
   ```bash
   # Генерация секретного ключа:
   openssl rand -base64 32
   ```
3. **MAKE_WEBHOOK_URL** - Получите после настройки Make сценариев
4. **TELEGRAM_BOT_USERNAME** - Username вашего бота (без @)

#### Bot (.env):
1. **TELEGRAM_BOT_TOKEN** - Получите от @BotFather:
   - Откройте [@BotFather](https://t.me/BotFather) в Telegram
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Скопируйте токен

#### Frontend (.env):
1. **VITE_API_URL** - Оставьте `http://localhost:3000` для разработки
   - Для production измените на URL вашего Backend API

---

## 🔐 Безопасность

### ⚠️ Важно:

1. **Никогда не коммитьте .env файлы в Git!**
   - Они уже добавлены в `.gitignore`

2. **Используйте разные JWT_SECRET для разных окружений:**
   - Development: можно использовать простой ключ
   - Production: используйте сильный случайный ключ

3. **В Production:**
   - Используйте переменные окружения сервера вместо .env файлов
   - Храните секреты в безопасном месте (AWS Secrets Manager, etc.)

---

## 📝 Примеры для разных окружений

### Development (локальная разработка):

**backend/.env:**
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
CORS_ORIGIN="http://localhost:5173"
```

**bot/.env:**
```env
NODE_ENV=development
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
API_URL="http://localhost:3000"
```

**frontend/.env:**
```env
VITE_API_URL="http://localhost:3000"
```

### Production:

**backend/.env:**
```env
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@db-host:5432/make_bot?schema=public&sslmode=require"
JWT_SECRET="super-secure-random-key-min-32-chars"
CORS_ORIGIN="https://your-frontend-domain.com"
MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-production-webhook"
TELEGRAM_BOT_USERNAME="your_production_bot"
```

**bot/.env:**
```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN="your-production-bot-token"
API_URL="https://api.your-domain.com"
```

**frontend/.env:**
```env
VITE_API_URL="https://api.your-domain.com"
```

---

## ✅ Checklist

- [ ] Создан `backend/.env` из `backend/.env.example`
- [ ] Создан `bot/.env` из `bot/.env.example`
- [ ] Создан `frontend/.env` из `frontend/.env.example`
- [ ] Настроен `DATABASE_URL` в `backend/.env`
- [ ] Сгенерирован `JWT_SECRET` для `backend/.env`
- [ ] Получен `TELEGRAM_BOT_TOKEN` от @BotFather
- [ ] Добавлен `TELEGRAM_BOT_TOKEN` в `bot/.env`
- [ ] Добавлен `TELEGRAM_BOT_USERNAME` в `backend/.env`
- [ ] Настроен `VITE_API_URL` в `frontend/.env`
- [ ] После настройки Make добавлен `MAKE_WEBHOOK_URL` в `backend/.env`

---

## 🆘 Troubleshooting

### Проблема: Backend не подключается к БД

**Решение:**
- Проверьте `DATABASE_URL` в `backend/.env`
- Убедитесь, что PostgreSQL запущен: `docker-compose up -d`
- Проверьте логи: `docker-compose logs db`

### Проблема: Bot не запускается

**Решение:**
- Проверьте `TELEGRAM_BOT_TOKEN` в `bot/.env`
- Убедитесь, что токен правильный (без пробелов)
- Проверьте, что Backend API запущен и доступен

### Проблема: Frontend не подключается к Backend

**Решение:**
- Проверьте `VITE_API_URL` в `frontend/.env`
- Убедитесь, что переменная начинается с `VITE_`
- Перезапустите dev сервер после изменения .env

---

## 📚 Дополнительная информация

- [Prisma Environment Variables](https://www.prisma.io/docs/concepts/components/prisma-schema/using-environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

