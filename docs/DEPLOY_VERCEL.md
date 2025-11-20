# Деплой фронтенда на Vercel

## Преимущества Vercel

- ✅ Нет проблем с Docker кэшем
- ✅ Автоматический деплой при push в GitHub
- ✅ Быстрая сборка и деплой
- ✅ Автоматический HTTPS
- ✅ CDN для статических файлов
- ✅ Простая настройка

## Шаги для деплоя

### 1. Подготовка проекта

Убедитесь, что все изменения закоммичены и запушены:

```bash
git add .
git commit -m "prepare for Vercel deployment"
git push origin main
```

### 2. Подключение к Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Выберите репозиторий `make-bot`

### 3. Настройка проекта

**Root Directory:** Оставьте пустым (или укажите `frontend` если деплоите только фронтенд)

**Framework Preset:** Vite (должен определиться автоматически)

**Build Command:** `npm install && npm run build --workspace=frontend`

**Output Directory:** `frontend/dist`

**Install Command:** `npm install`

### 4. Переменные окружения

Добавьте следующие переменные окружения в Vercel:

- `VITE_API_URL` - URL вашего бэкенда (например: `https://your-backend.railway.app`)
- `VITE_SENTRY_DSN` - DSN для Sentry (опционально)

**Важно:** В `frontend/vercel.json` обновите URL бэкенда в rewrites:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR-BACKEND-URL.railway.app/api/$1"
    }
  ]
}
```

### 5. Деплой

1. Нажмите "Deploy"
2. Vercel автоматически соберет и задеплоит проект
3. После успешного деплоя вы получите URL вида: `https://your-project.vercel.app`

### 6. Настройка домена (опционально)

1. В настройках проекта перейдите в "Domains"
2. Добавьте свой домен
3. Следуйте инструкциям для настройки DNS

## Обновление конфигурации

Если нужно изменить URL бэкенда:

1. Обновите `frontend/vercel.json` с новым URL
2. Закоммитьте и запушьте изменения
3. Vercel автоматически пересоберет проект

## Troubleshooting

### Ошибка сборки

Если сборка падает с ошибкой TypeScript:

1. Проверьте локально: `cd frontend && npm run build`
2. Убедитесь, что все файлы корректы
3. Проверьте логи сборки в Vercel

### API запросы не работают

1. Проверьте переменную окружения `VITE_API_URL`
2. Убедитесь, что rewrites в `vercel.json` настроены правильно
3. Проверьте CORS настройки на бэкенде

### Проблемы с роутингом

Убедитесь, что в `vercel.json` есть rewrite для SPA:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Откат к предыдущей версии

В Vercel можно легко откатиться к предыдущей версии:

1. Перейдите в "Deployments"
2. Найдите нужную версию
3. Нажмите "..." → "Promote to Production"

