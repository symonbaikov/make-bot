# Быстрый старт: Переменные окружения

## 📁 Где находятся .env файлы

Каждый сервис имеет свой `.env` файл:

```
make-bot/
├── backend/.env      ← Переменные для Backend API
├── bot/.env          ← Переменные для Telegram Bot
└── frontend/.env     ← Переменные для Frontend
```

---

## 🚀 Быстрая настройка

### 1. Создайте .env файлы из примеров:

```bash
# Backend
cp backend/.env.example backend/.env

# Bot
cp bot/.env.example bot/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Настройте обязательные переменные:

#### ✅ Backend (.env) - ОБЯЗАТЕЛЬНО:

```env
DATABASE_URL="postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"
JWT_SECRET="сгенерируйте-случайный-ключ-минимум-32-символа"
TELEGRAM_BOT_USERNAME="your_bot_username"
MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-url"  # После настройки Make
```

**Генерация JWT_SECRET:**
```bash
openssl rand -base64 32
```

#### ✅ Bot (.env) - ОБЯЗАТЕЛЬНО:

```env
TELEGRAM_BOT_TOKEN="токен-от-botfather"
API_URL="http://localhost:3000"
```

**Как получить TELEGRAM_BOT_TOKEN:**
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен

#### ✅ Frontend (.env) - ОБЯЗАТЕЛЬНО:

```env
VITE_API_URL="http://localhost:3000"
```

---

## 📋 Полный список переменных

### Backend (.env)

| Переменная | Обязательно | Описание | Пример |
|-----------|-------------|----------|--------|
| `DATABASE_URL` | ✅ | URL подключения к PostgreSQL | `postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public` |
| `JWT_SECRET` | ✅ | Секретный ключ для JWT | `your-super-secret-key` |
| `TELEGRAM_BOT_USERNAME` | ✅ | Username бота (без @) | `your_bot` |
| `MAKE_WEBHOOK_URL` | ✅ | Webhook URL из Make | `https://hook.us1.make.com/...` |
| `PORT` | ❌ | Порт сервера (по умолчанию: 3000) | `3000` |
| `NODE_ENV` | ❌ | Окружение (по умолчанию: development) | `development` |
| `LOG_LEVEL` | ❌ | Уровень логирования | `info` |
| `JWT_EXPIRES_IN` | ❌ | Время жизни токена | `7d` |
| `CORS_ORIGIN` | ❌ | URL фронтенда | `http://localhost:5173` |

### Bot (.env)

| Переменная | Обязательно | Описание | Пример |
|-----------|-------------|----------|--------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен от @BotFather | `123456789:ABC...` |
| `API_URL` | ✅ | URL Backend API | `http://localhost:3000` |
| `NODE_ENV` | ❌ | Окружение | `development` |
| `PAYPAL_CLIENT_ID` | ❌ | PayPal Client ID | `your-client-id` |
| `PAYPAL_MODE` | ❌ | Режим PayPal | `sandbox` |

### Frontend (.env)

| Переменная | Обязательно | Описание | Пример |
|-----------|-------------|----------|--------|
| `VITE_API_URL` | ✅ | URL Backend API | `http://localhost:3000` |

---

## ⚠️ Важно

1. **Никогда не коммитьте .env файлы в Git!** (они уже в .gitignore)
2. **Используйте .env.example как шаблон**
3. **В Production используйте переменные окружения сервера**

---

## 📚 Подробная документация

См. `ENV_SETUP.md` для полной документации по переменным окружения.

