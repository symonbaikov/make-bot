# 🔧 Использование TCP Proxy для подключения к PostgreSQL

## Проблема

Ошибка: `connect ETIMEDOUT 66.33.22.31:5432`

Публичный домен `postgres-production-619b.up.railway.app` недоступен или требует дополнительной настройки.

## ✅ Решение: Используйте TCP Proxy

У вас уже есть TCP Proxy настроенный:
- **TCP Proxy:** `shortline.proxy.rlwy.net:24524` → `:5432`

Этот прокси специально создан для TCP подключений и должен работать надежнее.

### Шаг 1: Установите DATABASE_URL с TCP Proxy

```bash
cd /Users/symonbaikov/make-bot/backend

# Используйте TCP Proxy (замените YOUR_PASSWORD на реальный пароль)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@shortline.proxy.rlwy.net:24524/railway"
```

**Где взять пароль:**
1. Railway → PostgreSQL сервис → Variables
2. Найдите `POSTGRES_PASSWORD`
3. Скопируйте значение

### Шаг 2: Проверьте подключение

```bash
# Проверьте подключение
npx prisma db execute --stdin <<< "SELECT 1;"
```

Если команда выполнилась без ошибок - подключение работает!

### Шаг 3: Запустите проверку таблиц

```bash
../scripts/check-tables.sh
```

Или используйте Prisma Studio:

```bash
npx prisma studio
```

## Альтернатива: Попробуйте с SSL параметрами

Если TCP Proxy тоже не работает, попробуйте добавить SSL параметры:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway?sslmode=require"
```

Или для TCP Proxy:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@shortline.proxy.rlwy.net:24524/railway?sslmode=require"
```

## Проверка через Railway Query (если локальное подключение не работает)

Если локальное подключение не работает, проверьте таблицы через Railway UI:

1. **Откройте Railway → PostgreSQL сервис → Database → Query**
2. **Выполните SQL:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Если таблицы есть, они появятся в результатах.

## Почему TCP Proxy лучше?

TCP Proxy (`shortline.proxy.rlwy.net:24524`) специально настроен Railway для внешних TCP подключений и обычно работает надежнее, чем публичный домен.

## Что должно быть:

После успешных миграций должны быть таблицы:
- `_prisma_migrations` - таблица миграций Prisma
- `actions` - журнал действий
- `sessions` - сессии платежей
- `users` - пользователи Telegram бота
- `web_users` - администраторы веб-панели

Если таблиц нет - примените миграции снова:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@shortline.proxy.rlwy.net:24524/railway"
npx prisma db push --skip-generate --accept-data-loss
```

