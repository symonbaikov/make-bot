# Исправление проблемы с подключением к базе данных в проде

## Проблема

Бэкенд не может подключиться к базе данных в проде. В логах видно:
- `Database not ready yet`
- `Database is unavailable - sleeping`
- `502 Bad Gateway` при запросах к API

## Что было исправлено

1. **Улучшен скрипт проверки подключения к БД** (`docker-entrypoint.sh`):
   - Добавлена проверка наличия `DATABASE_URL`
   - Добавлен таймаут (максимум 30 попыток)
   - Автоматическое определение необходимости SSL для Railway PostgreSQL
   - Улучшенное логирование для диагностики

## Что нужно проверить в Railway

### 1. Проверьте переменную окружения DATABASE_URL

В Railway:
1. Откройте сервис `@make-bot/backend`
2. Перейдите в раздел "Variables"
3. Убедитесь, что `DATABASE_URL` установлен

**Правильный формат DATABASE_URL для Railway:**
```
postgresql://postgres:password@hostname.railway.app:5432/railway?sslmode=require
```

### 2. Проверьте подключение PostgreSQL сервиса

В Railway:
1. Откройте сервис PostgreSQL
2. Перейдите в раздел "Variables"
3. Скопируйте значение `DATABASE_URL` или `POSTGRES_URL`
4. Убедитесь, что этот URL установлен в переменных окружения бэкенда

### 3. Проверьте, что PostgreSQL сервис запущен

В Railway:
1. Откройте сервис PostgreSQL
2. Проверьте статус - должен быть "Active"
3. Проверьте логи - не должно быть ошибок

### 4. Проверьте сетевые настройки

В Railway:
1. Убедитесь, что бэкенд и PostgreSQL находятся в одном проекте
2. Проверьте, что нет ограничений на сетевые подключения

## Диагностика

### Проверка логов

После перезапуска бэкенда проверьте логи. Должны появиться сообщения:

**Успешное подключение:**
```
✅ Database connection successful
✅ Database query successful
   Current time: ...
   PostgreSQL version: ...
```

**Ошибка подключения:**
```
❌ Database connection failed: [описание ошибки]
   Error code: [код ошибки]
   Host: [хост]
   Port: [порт]
```

### Частые ошибки и решения

#### Ошибка: "DATABASE_URL is not set"
**Решение:** Установите переменную окружения `DATABASE_URL` в Railway

#### Ошибка: "Connection refused" или "ECONNREFUSED"
**Решение:** 
- Проверьте, что PostgreSQL сервис запущен
- Проверьте правильность хоста и порта в DATABASE_URL
- Убедитесь, что сервисы находятся в одном проекте Railway

#### Ошибка: "SSL connection required"
**Решение:** 
- Убедитесь, что DATABASE_URL содержит `?sslmode=require`
- Или добавьте `?sslmode=require` в конец DATABASE_URL

#### Ошибка: "password authentication failed"
**Решение:** 
- Проверьте правильность пароля в DATABASE_URL
- Скопируйте DATABASE_URL заново из PostgreSQL сервиса

#### Ошибка: "database does not exist"
**Решение:** 
- Проверьте правильность имени базы данных в DATABASE_URL
- Для Railway обычно используется имя базы из URL

## Быстрая проверка

1. **Проверьте DATABASE_URL в Railway:**
   ```bash
   # В Railway UI: Backend → Variables → DATABASE_URL
   # Должен быть установлен и иметь формат:
   postgresql://user:password@host:port/database?sslmode=require
   ```

2. **Перезапустите бэкенд:**
   - В Railway: Backend → Deployments → Redeploy
   - Или сделайте новый коммит для автоматического деплоя

3. **Проверьте логи:**
   - В Railway: Backend → Deploy Logs
   - Ищите сообщения о подключении к БД

4. **Проверьте API:**
   - Откройте: `https://make-botbackend-production.up.railway.app/health`
   - Должен вернуть `{"status":"ok"}`

## Если проблема сохраняется

1. **Проверьте формат DATABASE_URL:**
   - Должен начинаться с `postgresql://` или `postgres://`
   - Должен содержать хост, порт, пользователя, пароль и имя базы
   - Для Railway обычно требуется `?sslmode=require`

2. **Проверьте логи PostgreSQL:**
   - В Railway: PostgreSQL → Logs
   - Ищите ошибки подключения

3. **Проверьте сетевые настройки:**
   - Убедитесь, что бэкенд и PostgreSQL в одном проекте
   - Проверьте, что нет firewall правил

4. **Попробуйте пересоздать DATABASE_URL:**
   - В Railway: PostgreSQL → Variables
   - Скопируйте DATABASE_URL заново
   - Вставьте в Backend → Variables → DATABASE_URL

## Дополнительная информация

После исправления скрипта проверки подключения:
- Максимум 30 попыток подключения (60 секунд)
- Автоматическое определение необходимости SSL
- Подробное логирование для диагностики
- Правильная обработка ошибок

Если после всех проверок проблема сохраняется, проверьте:
- Статус PostgreSQL сервиса в Railway
- Правильность DATABASE_URL (скопируйте заново из PostgreSQL сервиса)
- Сетевые настройки Railway

