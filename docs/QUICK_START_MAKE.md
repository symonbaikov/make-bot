# Быстрый старт: Интеграция Telegram бота с Make и Google Sheets

## Краткое описание

Когда пользователь заполняет данные в Telegram боте (email, имя, фамилия, телефон), они автоматически:

1. ✅ Сохраняются в базу данных PostgreSQL
2. ✅ Отправляются в Make через webhook
3. ✅ Записываются в Google Sheets через Make сценарий
4. ✅ Отображаются в Dashboard веб-приложения

## Пошаговая инструкция

### Шаг 1: Настройка Make сценария

1. **Войдите в Make** (https://www.make.com)

2. **Создайте новый сценарий:**
   - Нажмите "Create a new scenario"
   - Назовите: "Telegram Bot Data Collection"

3. **Добавьте Webhook модуль (триггер):**
   - Нажмите "+" → выберите "Webhooks" → "Custom webhook"
   - Нажмите "Add" → назовите "Bot Webhook"
   - **Скопируйте Webhook URL** (он понадобится на следующем шаге)
   - Нажмите "Save"

4. **Добавьте Google Sheets модуль "Search Rows" (для проверки дубликатов):**
   - Нажмите "+" → выберите "Google Sheets" → "Search Rows"
   - Подключите ваш Google аккаунт
   - Выберите Spreadsheet и лист
   - **Настройте фильтр:**
     - Column: `Email`
     - Operator: `Equal to`
     - Value: `{{1.email}}`

5. **Добавьте Router модуль:**
   - Нажмите "+" → выберите "Router"
   - Настройте два пути:
     - **Путь 1:** Email найден → ничего не делать
     - **Путь 2:** Email не найден → продолжить

6. **Добавьте Google Sheets модуль "Add a Row" в путь 2:**
   - В пути "Email не найден", нажмите "+"
   - Выберите "Google Sheets" → "Add a Row"
   - Выберите тот же Spreadsheet и лист

7. **Настройте маппинг полей:**

   В модуле "Add a Row" сопоставьте поля (для Telegram бота нужны только эти три):

   ```
   Email         → {{1.email}}
   First Name    → {{1.firstName}}
   Last Name     → {{1.lastName}}
   ```

   **Примечание:** Другие поля (Session ID, Phone Number, Plan, Amount и т.д.) заполняются в других сценариях Make.

8. **Сохраните и активируйте сценарий:**
   - Нажмите "Save"
   - Включите сценарий (переключите в положение ON)

### Шаг 2: Настройка Backend

1. **Откройте файл `backend/.env`**

2. **Добавьте URL webhook из Make:**

   ```env
   MAKE_WEBHOOK_URL=https://hook.us.make.com/ваш-webhook-url
   ```

3. **Перезапустите backend:**
   ```bash
   npm run dev
   ```

### Шаг 3: Подготовка Google Sheets

1. **Создайте новую таблицу** в Google Sheets

2. **Добавьте заголовки в первую строку (минимум для Telegram бота):**

   ```
   Email | First Name | Last Name
   ```

   **Примечание:** Если в вашей таблице уже есть другие колонки, они заполняются в других сценариях Make.

3. **Зафиксируйте первую строку:**
   - View → Freeze → 1 row

### Шаг 4: Тестирование

1. **Откройте Telegram бота**

2. **Отправьте команду:**

   ```
   /start <session_id>
   ```

   (где `session_id` - ID существующей сессии)

3. **Заполните данные:**
   - Email
   - Имя
   - Фамилию

4. **Проверьте результаты:**
   - ✅ В Make: сценарий должен выполниться успешно
   - ✅ В Google Sheets: данные должны появиться в колонках Email, First Name, Last Name
   - ✅ В Dashboard: данные должны отображаться в списке платежей

## Что происходит автоматически

### Поток данных:

```
Пользователь в Telegram боте
    ↓
Заполняет: Email → Имя → Фамилия → Телефон
    ↓
Бот отправляет данные на Backend API
    ↓
Backend сохраняет в PostgreSQL БД
    ↓
Backend отправляет webhook в Make
    ↓
Make сценарий записывает в Google Sheets
    ↓
Dashboard отображает данные из БД
```

### Данные в Dashboard

Dashboard автоматически показывает:

- **Список всех сессий** на странице `/payments`
- **Статистику** на странице `/dashboard`
- **Фильтры** по статусу, плану, дате
- **Поиск** по Session ID, Email, Transaction ID

## Проверка работы

### Логи Backend

Проверьте логи backend - должно быть:

```
[info] Webhook sent to Make successfully { sessionId: 'session-123' }
```

### Make сценарий

В Make проверьте:

- ✅ Сценарий включен (ON)
- ✅ Выполнения сценария успешны (зеленые галочки)
- ✅ Нет ошибок в логах выполнения

### Google Sheets

Проверьте:

- ✅ Данные появляются в таблице
- ✅ Колонки Email, First Name, Last Name заполнены корректно

## Troubleshooting

### Данные не записываются в Google Sheets

**Проверьте:**

1. Make сценарий включен?
2. Webhook URL правильный в `backend/.env`?
3. Логи backend показывают отправку webhook?

### Данные не отображаются в Dashboard

**Проверьте:**

1. Backend API работает? (`http://localhost:3000/health`)
2. Данные есть в БД? (можно проверить через Prisma Studio)
3. Frontend подключен к правильному API URL?

### Webhook не отправляется

**Проверьте:**

1. `MAKE_WEBHOOK_URL` установлен в `.env`?
2. URL правильный и доступен?
3. Логи backend на наличие ошибок?

## Дополнительная информация

Подробная документация: [MAKE_INTEGRATION.md](./MAKE_INTEGRATION.md)

## Поддержка

Если возникли проблемы:

1. Проверьте логи backend
2. Проверьте логи Make сценария
3. Обратитесь к разработчикам
