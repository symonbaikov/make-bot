# Настройка базы данных для локальной разработки

## Быстрый старт

### Вариант 1: Docker (Рекомендуется)

1. Запустите PostgreSQL контейнер:
```bash
docker-compose up -d postgres
```

Или если используете только PostgreSQL:
```bash
docker run -d \
  --name make-bot-postgres \
  -e POSTGRES_USER=makebot \
  -e POSTGRES_PASSWORD=makebot123 \
  -e POSTGRES_DB=make_bot \
  -p 5433:5432 \
  postgres:15-alpine
```

2. Проверьте что контейнер запущен:
```bash
docker ps | grep make-bot-postgres
```

3. Приложение автоматически подключится к БД на порту 5433

### Вариант 2: Локальный PostgreSQL

1. Установите PostgreSQL локально
2. Создайте базу данных и пользователя:
```sql
CREATE USER makebot WITH PASSWORD 'makebot123';
CREATE DATABASE make_bot OWNER makebot;
```

3. Установите переменную окружения:
```bash
export DATABASE_URL="postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"
```

## Проверка подключения

После запуска приложения проверьте логи - должно быть сообщение:
```
✅ Auto-detected database connection and set DATABASE_URL
✅ DATABASE_URL validated successfully
✅ Server running on port 3000
```

## Решение проблем

### Ошибка: "No database connection available"

**Причина:** PostgreSQL не запущен или недоступен

**Решение:**
1. Проверьте что PostgreSQL запущен:
   ```bash
   docker ps | grep postgres
   ```
2. Если контейнер остановлен, запустите его:
   ```bash
   docker start make-bot-postgres
   ```
3. Если контейнера нет, создайте его (см. Вариант 1 выше)

### Ошибка: "DATABASE_URL contains placeholder"

**Причина:** В переменной окружения установлен placeholder вместо реального URL

**Решение:**
1. Проверьте переменные окружения:
   ```bash
   echo $DATABASE_URL
   ```
2. Если видите placeholder типа `postgresql://user:****@host:port/database`, удалите его:
   ```bash
   unset DATABASE_URL
   ```
3. Приложение автоматически определит подключение

### Ошибка: "Connection refused"

**Причина:** PostgreSQL слушает на другом порту или хосте

**Решение:**
1. Проверьте порт PostgreSQL:
   ```bash
   docker port make-bot-postgres
   ```
2. Должен быть `5433:5432` (внешний порт 5433)
3. Если порт другой, установите переменную:
   ```bash
   export DB_PORT=ваш_порт
   ```

## Переменные окружения для БД

Можно установить следующие переменные для кастомизации:

- `DATABASE_URL` - полная строка подключения (приоритет)
- `DB_HOST` - хост БД (по умолчанию: 127.0.0.1)
- `DB_PORT` - порт БД (по умолчанию: 5433 для Docker, 5432 для локального)
- `DB_USER` - пользователь БД (по умолчанию: makebot)
- `DB_PASSWORD` - пароль БД (по умолчанию: makebot123)
- `DB_NAME` - имя БД (по умолчанию: make_bot)

## Миграции базы данных

После первого запуска выполните миграции:

```bash
cd backend
npm run db:migrate
```

Или если используете Docker:
```bash
docker-compose exec backend npm run db:migrate
```

## Остановка базы данных

Чтобы остановить PostgreSQL контейнер:
```bash
docker stop make-bot-postgres
```

Чтобы удалить контейнер и данные:
```bash
docker stop make-bot-postgres
docker rm make-bot-postgres
docker volume rm make-bot_postgres_data
```

