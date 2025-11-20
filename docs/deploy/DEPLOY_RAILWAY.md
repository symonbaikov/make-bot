# Деплой на Railway

## 🚀 Быстрый старт

### 1. Создать аккаунт на Railway

1. Перейдите на https://railway.app
2. Войдите через GitHub
3. Создайте новый проект

### 2. Добавить PostgreSQL

1. В проекте Railway нажмите **+ New**
2. Выберите **Database** → **Add PostgreSQL**
3. Railway автоматически создаст базу данных
4. Скопируйте **DATABASE_URL** из переменных окружения

### 3. Задеплоить Backend API

1. В проекте Railway нажмите **+ New** → **GitHub Repo**
2. Выберите ваш репозиторий
3. Railway автоматически определит Dockerfile
4. Настройте переменные окружения:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<скопированный из PostgreSQL>
JWT_SECRET=<сгенерируйте случайный ключ>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.vercel.app
MAKE_WEBHOOK_URL=<webhook URL из Make>
TELEGRAM_BOT_USERNAME=your_bot_username
```

5. Railway автоматически задеплоит
6. Скопируйте публичный URL (например: `https://your-app.railway.app`)

### 4. Задеплоить Bot

1. В том же проекте Railway нажмите **+ New** → **GitHub Repo**
2. Выберите тот же репозиторий
3. В настройках укажите:
   - **Root Directory:** `bot`
   - **Dockerfile Path:** `bot/Dockerfile`
4. Настройте переменные окружения:

```
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<токен от BotFather>
API_URL=https://your-backend.railway.app
PORT=3001
```

5. Railway задеплоит Bot
6. Получите публичный URL для Bot (например: `https://your-bot.railway.app`)
7. **ВАЖНО:** Добавьте переменную окружения `TELEGRAM_WEBHOOK_URL`:

```
TELEGRAM_WEBHOOK_URL=https://your-bot.railway.app/webhook
```

Это переключит бота в webhook режим и предотвратит конфликты при нескольких экземплярах.

### 5. Задеплоить Frontend на Vercel

1. Перейдите на https://vercel.com
2. Войдите через GitHub
3. **Add New Project** → выберите репозиторий
4. Настройки:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
5. Добавьте переменные окружения:

```
VITE_API_URL=https://your-backend.railway.app
```

6. Vercel задеплоит Frontend
7. Получите публичный URL (например: `https://your-app.vercel.app`)

### 6. Настроить базу данных

1. В Railway откройте PostgreSQL
2. Скопируйте **Connection String**
3. Обновите `DATABASE_URL` в Backend переменных окружения
4. Выполните миграции:

```bash
# Через Railway CLI или через Prisma Studio
railway run --service backend npm run db:migrate
railway run --service backend npm run db:seed
```

Или через Railway Dashboard → Backend → **Shell**:

```bash
npm run db:migrate
npm run db:seed
```

### 7. Настроить Make

1. Откройте Make сценарии
2. Обновите webhook URL'ы на публичные:
   - Backend API: `https://your-backend.railway.app/api/webhook/bot`
   - Backend API: `https://your-backend.railway.app/api/webhook/paypal`
3. Обновите PostgreSQL подключение в Make на Railway DATABASE_URL

### 8. Настроить Telegram Bot Webhook

**ВАЖНО:** Бот автоматически установит webhook при запуске, если переменная `TELEGRAM_WEBHOOK_URL` установлена.

Если нужно установить webhook вручную или проверить статус:

```bash
# Проверить текущий webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Установить webhook вручную (если нужно)
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-bot.railway.app/webhook"

# Удалить webhook (для переключения на polling)
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

**Примечание:** В production рекомендуется использовать webhook режим для избежания конфликтов при нескольких экземплярах.

---

## ✅ Checklist

- [ ] Создан аккаунт на Railway
- [ ] Добавлен PostgreSQL в Railway
- [ ] Задеплоен Backend API
- [ ] Задеплоен Bot
- [ ] Задеплоен Frontend на Vercel
- [ ] Выполнены миграции базы данных
- [ ] Засеяна база данных (создан админ)
- [ ] Обновлены переменные окружения
- [ ] Настроены Make сценарии с публичными URL'ами
- [ ] Протестирован полный flow

---

## 🔗 Публичные URL'ы

После деплоя у вас будут:

- **Backend API:** `https://your-backend.railway.app`
- **Bot:** `https://your-bot.railway.app` (или polling)
- **Frontend:** `https://your-app.vercel.app`
- **PostgreSQL:** (внутренний в Railway)

---

## 🧪 Тестирование после деплоя

1. Откройте Frontend URL
2. Войдите: `admin@example.com` / `admin123`
3. Протестируйте создание сессии
4. Протестируйте Telegram Bot
5. Протестируйте Make интеграцию

---

## 📚 Дополнительные ресурсы

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

