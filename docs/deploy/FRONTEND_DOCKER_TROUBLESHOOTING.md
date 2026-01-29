# 🔧 Troubleshooting Frontend Docker Build

## Ошибка: `Module.require` при сборке

Если вы получаете ошибку типа:

```
at Module.require (node:internal/modules/cjs/loader:1231:19)
```

Это обычно означает проблему с зависимостями или структурой проекта.

## Решения

### Решение 1: Проверка структуры файлов

Убедитесь, что в Railway:

1. **Root Directory** пустой (или `frontend` если Railway требует)
2. **Dockerfile Path** указан как `frontend/Dockerfile`
3. Все файлы закоммичены в Git

### Решение 2: Альтернативный Dockerfile (без workspace)

Если проблема сохраняется, создайте упрощенный Dockerfile в `frontend/Dockerfile.simple`:

```dockerfile
# Simplified Frontend Dockerfile (without workspace)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.node.json ./
COPY frontend/vite.config.ts ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/index.html ./
COPY frontend/src ./src

# Install dependencies directly in frontend
RUN npm install --legacy-peer-deps

# Build
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Затем в Railway укажите `frontend/Dockerfile.simple` как путь к Dockerfile.

### Решение 3: Проверка package-lock.json

Убедитесь, что `package-lock.json` существует в корне репозитория:

```bash
# В корне репозитория
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Решение 4: Локальная проверка сборки

Проверьте, что сборка работает локально:

```bash
cd frontend
npm install
npm run build
```

Если локально не работает, исправьте проблемы сначала.

### Решение 5: Проверка логов Railway

В Railway:

1. Откройте **Deployments** → последний деплой
2. Нажмите **View Logs**
3. Найдите точную строку с ошибкой
4. Проверьте, на каком этапе происходит ошибка:
   - `npm install` - проблема с зависимостями
   - `npm run build` - проблема с кодом или конфигурацией
   - Копирование файлов - проблема с путями

## Частые проблемы

### Проблема: "Cannot find module"

**Причина:** Зависимости не установлены или установлены неправильно

**Решение:**

- Убедитесь, что `package-lock.json` существует
- Проверьте, что все зависимости указаны в `package.json`
- Попробуйте удалить `node_modules` и переустановить

### Проблема: "TypeScript compilation error"

**Причина:** Проблемы с конфигурацией TypeScript

**Решение:**

- Проверьте `tsconfig.json` и `tsconfig.node.json`
- Убедитесь, что все файлы на месте
- Проверьте, что `tsconfig.json` правильно расширяет корневой файл

### Проблема: "Vite build error"

**Причина:** Проблемы с конфигурацией Vite или зависимостями

**Решение:**

- Проверьте `vite.config.ts`
- Убедитесь, что все плагины установлены
- Проверьте версии зависимостей

## Проверка после исправления

После применения исправлений:

1. ✅ Build проходит успешно
2. ✅ Все файлы скопированы правильно
3. ✅ Зависимости установлены
4. ✅ Сборка завершается без ошибок
5. ✅ Nginx запускается и слушает порт 80






