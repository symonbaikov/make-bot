# 🔍 Проверка таблиц в базе данных

## Проблема

Railway UI показывает "You have no tables", но мы только что применили миграции.

## Возможные причины:

1. **Таблицы созданы в другой базе данных** - DATABASE_URL указывает на другую БД
2. **Railway UI показывает другую базу** - возможно, несколько PostgreSQL сервисов
3. **Проблема с правами доступа** - таблицы созданы, но UI их не видит
4. **Кэш Railway UI** - нужно обновить страницу

## ✅ Решение: Проверьте таблицы напрямую

### Способ 1: Через скрипт проверки

```bash
cd /Users/symonbaikov/make-bot/backend

# Установите DATABASE_URL (используйте тот же, что для миграций)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"

# Запустите проверку
../scripts/check-tables.sh
```

Скрипт покажет:
- К какой базе данных подключены
- Какие таблицы существуют
- Есть ли ошибки подключения

### Способ 2: Через Prisma Studio

```bash
cd /Users/symonbaikov/make-bot/backend

# Установите DATABASE_URL
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"

# Запустите Prisma Studio
npx prisma studio
```

Prisma Studio откроется в браузере и покажет все таблицы и данные.

### Способ 3: Через SQL запрос

```bash
cd /Users/symonbaikov/make-bot/backend

# Установите DATABASE_URL
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"

# Выполните SQL запрос
npx prisma db execute --stdin <<< "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
"
```

## Проверка правильности DATABASE_URL

Убедитесь, что используете правильный DATABASE_URL:

1. **Откройте Railway → PostgreSQL сервис → Variables**
2. **Скопируйте `DATABASE_URL`** или соберите из:
   - `POSTGRES_HOST` (публичный домен)
   - `POSTGRES_PORT` (обычно 5432)
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DB` (обычно `railway`)

3. **Формат должен быть:**
   ```
   postgresql://postgres:PASSWORD@PUBLIC_HOST:PORT/DATABASE
   ```

## Если таблицы не найдены:

### Вариант 1: Примените миграции снова

```bash
cd /Users/symonbaikov/make-bot/backend
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"
npx prisma db push --skip-generate --accept-data-loss
```

### Вариант 2: Проверьте, что используете правильную базу данных

Возможно, у вас несколько PostgreSQL сервисов в Railway. Убедитесь, что:
- Используете тот же PostgreSQL сервис, что и Backend
- DATABASE_URL в Backend Variables совпадает с тем, что используете локально

### Вариант 3: Обновите Railway UI

- Обновите страницу в браузере (F5 или Cmd+R)
- Или откройте PostgreSQL → Database → Data заново

## Проверка через Railway Query

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

После успешного применения миграций должны быть таблицы:
- `_prisma_migrations` - таблица миграций Prisma
- `actions` - журнал действий
- `sessions` - сессии платежей
- `users` - пользователи Telegram бота
- `web_users` - администраторы веб-панели

Если этих таблиц нет - миграции не применились к этой базе данных.

