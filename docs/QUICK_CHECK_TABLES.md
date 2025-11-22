# 🔍 Быстрая проверка таблиц

## Проблема

Скрипт проверки требует `DATABASE_URL`, но он не установлен в текущей сессии терминала.

## ✅ Решение

### Шаг 1: Установите DATABASE_URL

```bash
cd /Users/symonbaikov/make-bot/backend

# Установите DATABASE_URL (замените YOUR_PASSWORD на реальный пароль)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"
```

**Где взять пароль:**
1. Откройте Railway → PostgreSQL сервис → Variables
2. Найдите `POSTGRES_PASSWORD`
3. Скопируйте значение

### Шаг 2: Запустите проверку

```bash
../scripts/check-tables.sh
```

Или проверьте через Prisma Studio (визуально):

```bash
npx prisma studio
```

Prisma Studio откроется в браузере и покажет все таблицы.

## Альтернатива: Проверка через Railway UI

1. **Откройте Railway → PostgreSQL сервис → Database → Query**
2. **Выполните SQL:**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Если таблицы есть, они появятся в результатах.

## Что должно быть:

После успешных миграций должны быть таблицы:
- `_prisma_migrations` - таблица миграций Prisma
- `actions` - журнал действий  
- `sessions` - сессии платежей
- `users` - пользователи Telegram бота
- `web_users` - администраторы веб-панели

Если этих таблиц нет - миграции не применились. Примените их снова:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"
npx prisma db push --skip-generate --accept-data-loss
```

