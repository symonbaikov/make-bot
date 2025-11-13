# 🚀 Быстрый деплой на Railway

## Почему Railway?

✅ Все в одном месте (Backend, Bot, PostgreSQL)  
✅ Бесплатный tier доступен  
✅ Простой деплой из GitHub  
✅ Автоматический HTTPS  
✅ Встроенный PostgreSQL  

---

## 📋 Пошаговая инструкция

### Шаг 1: Подготовка репозитория

1. Убедитесь, что код закоммичен в Git
2. Запушьте в GitHub (если еще не сделано)

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Шаг 2: Создать проект на Railway

1. Перейдите на https://railway.app
2. Войдите через GitHub
3. Нажмите **New Project**
4. Выберите **Deploy from GitHub repo**
5. Выберите ваш репозиторий `make-bot`

### Шаг 3: Добавить PostgreSQL

1. В проекте Railway нажмите **+ New**
2. Выберите **Database** → **Add PostgreSQL**
3. Railway создаст базу данных автоматически
4. Откройте PostgreSQL и скопируйте **DATABASE_URL**

### Шаг 4: Задеплоить Backend API

1. В проекте Railway нажмите **+ New** → **GitHub Repo**
2. Выберите тот же репозиторий
3. Railway определит Dockerfile автоматически
4. В настройках сервиса:
   - **Name:** `backend`
   - **Root Directory:** `backend` (если нужно)
5. Перейдите в **Variables** и добавьте:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<скопированный из PostgreSQL>
JWT_SECRET=<сгенерируйте: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend.vercel.app
MAKE_WEBHOOK_URL=<пока оставьте пустым, добавите после настройки Make>
TELEGRAM_BOT_USERNAME=your_bot_username
```

6. Railway автоматически задеплоит
7. Дождитесь завершения деплоя
8. Скопируйте **Public Domain** (например: `backend-production.up.railway.app`)

### Шаг 5: Выполнить миграции

1. В Railway откройте Backend сервис
2. Перейдите в **Deployments** → выберите последний деплой
3. Откройте **View Logs**
4. Или используйте **Shell**:

```bash
# В Railway Shell
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Шаг 6: Задеплоить Bot

1. В том же проекте Railway нажмите **+ New** → **GitHub Repo**
2. Выберите тот же репозиторий
3. В настройках:
   - **Name:** `bot`
   - **Root Directory:** `bot`
4. В **Variables** добавьте:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<токен от @BotFather>
API_URL=https://your-backend.railway.app
```

5. Railway задеплоит Bot

### Шаг 7: Задеплоить Frontend на Vercel

1. Перейдите на https://vercel.com
2. Войдите через GitHub
3. **Add New Project**
4. Выберите репозиторий `make-bot`
5. Настройки:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
6. **Environment Variables:**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
7. Нажмите **Deploy**
8. Vercel задеплоит и даст URL (например: `https://make-bot.vercel.app`)

### Шаг 8: Обновить CORS в Backend

1. В Railway откройте Backend → **Variables**
2. Обновите `CORS_ORIGIN` на URL Vercel:
   ```
   CORS_ORIGIN=https://make-bot.vercel.app
   ```
3. Railway автоматически перезапустит сервис

### Шаг 9: Настроить Make

1. Откройте Make сценарии
2. Обновите webhook URL'ы:
   - Bot webhook: `https://your-backend.railway.app/api/webhook/bot`
   - PayPal webhook: `https://your-backend.railway.app/api/webhook/paypal`
3. Обновите PostgreSQL подключение в Make на Railway DATABASE_URL
4. В Railway Backend → **Variables** добавьте:
   ```
   MAKE_WEBHOOK_URL=https://hook.us1.make.com/your-webhook-url
   ```

---

## ✅ Проверка после деплоя

### 1. Проверить Backend

```bash
curl https://your-backend.railway.app/health
```

Должен вернуть: `{"status":"ok",...}`

### 2. Проверить Frontend

1. Откройте `https://your-app.vercel.app`
2. Войдите: `admin@example.com` / `admin123`
3. Должна открыться админ-панель

### 3. Проверить Bot

1. Найдите бота в Telegram
2. Отправьте `/start`
3. Бот должен ответить

---

## 🔧 Troubleshooting

### Backend не запускается

- Проверьте логи в Railway
- Убедитесь, что все переменные окружения заполнены
- Проверьте, что миграции выполнены

### Frontend не подключается к Backend

- Проверьте `VITE_API_URL` в Vercel
- Проверьте `CORS_ORIGIN` в Railway Backend
- Убедитесь, что Backend доступен публично

### Bot не отвечает

- Проверьте `TELEGRAM_BOT_TOKEN` в Railway Bot
- Проверьте `API_URL` в Railway Bot
- Проверьте логи Bot в Railway

---

## 📝 Итоговые URL'ы

После деплоя сохраните:

- **Backend API:** `https://your-backend.railway.app`
- **Bot:** `https://your-bot.railway.app` (если используете webhook)
- **Frontend:** `https://your-app.vercel.app`
- **PostgreSQL:** (внутренний в Railway, доступен через DATABASE_URL)

---

## 🎯 Готово!

После деплоя у вас будет полностью рабочая система в облаке, готовая для интеграции с Make! 🚀

