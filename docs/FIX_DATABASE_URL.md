# 🔧 Исправление DATABASE_URL

## Проблема

Ошибка: `getaddrinfo ENOTFOUND postgres.railway.internal`

Это происходит потому, что `postgres.railway.internal` - это **внутренний адрес Railway**, который доступен только внутри Railway сети. Локально вы не можете подключиться к этому адресу.

## ✅ Решение: Используйте публичный адрес

### Шаг 1: Получите публичный адрес

У вас уже есть публичный доступ к PostgreSQL:
- **Публичный домен:** `postgres-production-619b.up.railway.app:5432`
- **TCP Proxy:** `shortline.proxy.rlwy.net:24524`

### Шаг 2: Установите правильный DATABASE_URL

Используйте **публичный домен** (не `railway.internal`):

```bash
cd /Users/symonbaikov/make-bot/backend

# Используйте публичный адрес (замените YOUR_PASSWORD на реальный пароль)
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-production-619b.up.railway.app:5432/railway"
```

**Где взять пароль:**
1. Railway → PostgreSQL сервис → Variables
2. Найдите `POSTGRES_PASSWORD`
3. Скопируйте значение

### Шаг 3: Проверьте подключение

```bash
# Проверьте подключение
npx prisma db execute --stdin <<< "SELECT 1;"
```

Если команда выполнилась без ошибок - подключение работает!

### Шаг 4: Запустите проверку таблиц

```bash
../scripts/check-tables.sh
```

Или используйте Prisma Studio:

```bash
npx prisma studio
```

## Альтернатива: Использовать TCP Proxy

Если публичный домен не работает, используйте TCP Proxy:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@shortline.proxy.rlwy.net:24524/railway"
```

## Важно:

❌ **НЕ используйте:** `postgres.railway.internal` (внутренний адрес)  
✅ **Используйте:** `postgres-production-619b.up.railway.app` (публичный адрес)

## Формат DATABASE_URL:

```
postgresql://postgres:PASSWORD@PUBLIC_HOST:PORT/DATABASE
```

Где:
- `PASSWORD` - пароль из Railway Variables (`POSTGRES_PASSWORD`)
- `PUBLIC_HOST` - публичный домен (`postgres-production-619b.up.railway.app`)
- `PORT` - порт (обычно `5432`)
- `DATABASE` - имя базы данных (обычно `railway`)

