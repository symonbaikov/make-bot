# ✅ Проверка админа после seed

## Проблема решена

Пароль админа был обновлен через скрипт `verify:admin`. Теперь пользователь должен существовать с правильным паролем.

## Данные для входа

- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** `ADMIN`

## Если вход все еще не работает

### 1. Проверьте логи Backend в Railway

1. Откройте Railway Dashboard
2. Перейдите в Backend сервис
3. Откройте вкладку "Deployments" или "Logs"
4. Найдите ошибки при попытке входа

### 2. Убедитесь, что Backend использует правильный DATABASE_URL

Backend в production должен использовать внутренний DATABASE_URL:
```
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

Это та же база данных, что и публичный URL, просто другой способ подключения.

### 3. Перезапустите Backend сервис

Иногда нужно перезапустить сервис, чтобы он переподключился к базе данных:

1. В Railway Dashboard → Backend сервис
2. Нажмите "Redeploy" или "Restart"

### 4. Проверьте переменные окружения Backend

Убедитесь, что в Backend сервисе установлен правильный `DATABASE_URL`:
- Railway Dashboard → Backend → Variables
- Должен быть `DATABASE_URL` с внутренним адресом

### 5. Попробуйте создать пользователя заново

Если ничего не помогает, создайте пользователя заново через скрипт:

```bash
cd backend
export DATABASE_URL="postgresql://postgres:TKEhJSwFtHFkGUvfTERXRzkMvcMQsxyP@shortline.proxy.rlwy.net:24524/railway?sslmode=require"
npm run create:admin
```

## Проверка через Railway Console

Можно также проверить пользователя через Railway Console:

1. Railway Dashboard → Backend → Console
2. Выполните:
   ```bash
   cd /app
   npm run verify:admin
   ```

Это проверит и исправит пользователя, используя внутренний DATABASE_URL.



