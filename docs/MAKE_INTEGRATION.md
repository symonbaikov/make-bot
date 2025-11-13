# Make Integration Guide

## Phase 5: Make Automation Scenarios

Это руководство описывает настройку сценариев в Make для автоматизации процессов.

---

## 📋 Обзор

Make получает webhook'и от Backend API и выполняет следующие задачи:
1. Обработка webhook от Telegram бота (email collection)
2. Обработка webhook от PayPal (payment notifications)
3. Access Provisioning (предоставление доступа)
4. Ночные проверки и алерты

---

## 🔧 Настройка подключения к PostgreSQL

### Шаг 1: Создать подключение к PostgreSQL в Make

1. В Make перейдите в **Connections** → **Add a connection**
2. Выберите **PostgreSQL**
3. Заполните данные подключения:
   - **Host:** `your-database-host` (например, `localhost` или `your-db-host.com`)
   - **Port:** `5432`
   - **Database:** `make_bot`
   - **Username:** `makebot` (или ваш пользователь)
   - **Password:** `makebot123` (или ваш пароль)
   - **SSL Mode:** `require` (для production) или `disable` (для development)

4. Сохраните подключение как `Make Bot PostgreSQL`

---

## 📥 Scenario 1: Bot Webhook Handler

### Описание
Обрабатывает webhook от Telegram бота при сборе email адреса.

### Webhook URL
Получите webhook URL в Make:
1. Создайте новый сценарий
2. Добавьте модуль **Webhooks** → **Custom webhook**
3. Скопируйте webhook URL
4. Добавьте его в Backend `.env`: `MAKE_WEBHOOK_URL_BOT=<your-webhook-url>`

### Payload Structure

```json
{
  "event": "bot_email_collected",
  "sessionId": "test-session-001",
  "email": "user@example.com",
  "tgUserId": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "plan": "STANDARD",
  "amount": 99.99
}
```

### Make Scenario Steps

#### Step 1: Webhook Trigger
- **Module:** Webhooks → Custom webhook
- **Settings:** 
  - Название: `Bot Email Collection`
  - Метод: `POST`
  - Параметры: автоматически из payload

#### Step 2: Upsert Session (PostgreSQL)
- **Module:** PostgreSQL → Execute a query
- **Connection:** `Make Bot PostgreSQL`
- **SQL Query:**
```sql
-- Upsert session with email_user
INSERT INTO sessions (
  session_id,
  plan,
  amount,
  currency,
  email_user,
  status,
  meta,
  created_at,
  updated_at
)
VALUES (
  '{{webhook.sessionId}}',
  '{{webhook.plan}}'::plan,
  {{webhook.amount}},
  'USD',
  '{{webhook.email}}',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sessions 
      WHERE session_id = '{{webhook.sessionId}}' 
      AND status IN ('PAID', 'COMPLETED')
    ) THEN 'PAID_PENDING_EMAIL'::session_status
    ELSE 'AWAITING_PAYMENT'::session_status
  END,
  jsonb_build_object(
    'tgUserId', '{{webhook.tgUserId}}',
    'firstName', '{{webhook.firstName}}',
    'lastName', '{{webhook.lastName}}',
    'source', 'telegram_bot'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (session_id) 
DO UPDATE SET
  email_user = EXCLUDED.email_user,
  meta = sessions.meta || EXCLUDED.meta,
  updated_at = NOW()
RETURNING id, session_id, status;
```

#### Step 3: Upsert User (PostgreSQL)
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Upsert user by tg_user_id
INSERT INTO users (
  tg_user_id,
  email,
  first_name,
  last_name,
  created_at,
  updated_at
)
VALUES (
  '{{webhook.tgUserId}}',
  '{{webhook.email}}',
  '{{webhook.firstName}}',
  '{{webhook.lastName}}',
  NOW(),
  NOW()
)
ON CONFLICT (tg_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW()
RETURNING id;
```

#### Step 4: Log Action (PostgreSQL)
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Log email collection action
INSERT INTO actions (
  type,
  ref,
  session_id,
  payload,
  created_at
)
VALUES (
  'EMAIL_COLLECTED'::action_type,
  '{{webhook.sessionId}}',
  (SELECT id FROM sessions WHERE session_id = '{{webhook.sessionId}}'),
  jsonb_build_object(
    'email', '{{webhook.email}}',
    'source', 'telegram_bot',
    'tgUserId', '{{webhook.tgUserId}}'
  ),
  NOW()
);
```

#### Step 5: Check if Payment Exists (Router)
- **Module:** Flow control → Router
- **Condition:** 
  - Route 1: `{{step2.status}} = 'PAID'` OR `{{step2.status}} = 'COMPLETED'`
  - Route 2: Otherwise

#### Step 6: Trigger Access Provisioning (Route 1)
- **Module:** HTTP → Make a request
- **URL:** `{{MAKE_WEBHOOK_URL_PROVISIONING}}`
- **Method:** `POST`
- **Body:**
```json
{
  "event": "provision_access",
  "sessionId": "{{webhook.sessionId}}",
  "email": "{{webhook.email}}",
  "paymentDate": "{{step2.payment_date}}"
}
```

---

## 💳 Scenario 2: PayPal Webhook Handler

### Описание
Обрабатывает webhook от PayPal при получении платежа.

### Webhook URL
Создайте отдельный webhook URL в Make для PayPal.

### Payload Structure

```json
{
  "event": "paypal_payment_received",
  "sessionId": "test-session-001",
  "txnId": "5O190127TN364715T",
  "emailPaypal": "payer@example.com",
  "amount": 99.99,
  "currency": "USD",
  "paymentDate": "2024-01-15T10:30:00Z",
  "status": "completed"
}
```

### Make Scenario Steps

#### Step 1: Webhook Trigger
- **Module:** Webhooks → Custom webhook
- **Settings:**
  - Название: `PayPal Payment`
  - Метод: `POST`

#### Step 2: Check for Duplicate Transaction
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Check if transaction already exists
SELECT id, session_id, status, payment_date
FROM sessions
WHERE txn_id = '{{webhook.txnId}}';
```

#### Step 3: Router - Check Duplicate
- **Module:** Flow control → Router
- **Condition:**
  - Route 1: `{{step2.id}} IS NOT NULL` (duplicate found)
  - Route 2: `{{step2.id}} IS NULL` (new transaction)

#### Step 4: Update Session (Route 2)
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Update session with payment information
UPDATE sessions
SET
  txn_id = '{{webhook.txnId}}',
  email_paypal = '{{webhook.emailPaypal}}',
  payment_date = '{{webhook.paymentDate}}'::timestamp,
  status = CASE 
    WHEN '{{webhook.status}}' = 'completed' THEN 'PAID'::session_status
    WHEN '{{webhook.status}}' = 'refunded' THEN 'REFUNDED'::session_status
    WHEN '{{webhook.status}}' = 'failed' THEN 'FAILED'::session_status
    ELSE 'PAID'::session_status
  END,
  meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'currency', '{{webhook.currency}}',
    'paypalStatus', '{{webhook.status}}',
    'paypalEmail', '{{webhook.emailPaypal}}'
  ),
  updated_at = NOW()
WHERE session_id = '{{webhook.sessionId}}'
RETURNING id, session_id, status, payment_date, email_user, email_paypal;
```

#### Step 5: Log Payment Action
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Log payment received action
INSERT INTO actions (
  type,
  ref,
  session_id,
  payload,
  created_at
)
VALUES (
  'PAYMENT_RECEIVED'::action_type,
  '{{webhook.txnId}}',
  '{{step4.id}}',
  jsonb_build_object(
    'txnId', '{{webhook.txnId}}',
    'emailPaypal', '{{webhook.emailPaypal}}',
    'amount', {{webhook.amount}},
    'currency', '{{webhook.currency}}',
    'paymentDate', '{{webhook.paymentDate}}',
    'status', '{{webhook.status}}'
  ),
  NOW()
);
```

#### Step 6: Router - Check if Email Exists
- **Module:** Flow control → Router
- **Condition:**
  - Route 1: `{{step4.email_user}} IS NOT NULL` OR `{{step4.email_paypal}} IS NOT NULL` (email available)
  - Route 2: Otherwise (no email yet)

#### Step 7: Trigger Access Provisioning (Route 1)
- **Module:** HTTP → Make a request
- **URL:** `{{MAKE_WEBHOOK_URL_PROVISIONING}}`
- **Method:** `POST`
- **Body:**
```json
{
  "event": "provision_access",
  "sessionId": "{{webhook.sessionId}}",
  "email": "{{step4.email_user}}",
  "emailPaypal": "{{step4.email_paypal}}",
  "paymentDate": "{{step4.payment_date}}"
}
```

---

## ✅ Scenario 3: Access Provisioning Module

### Описание
Предоставляет доступ пользователю после получения платежа и email.

### Webhook URL
Создайте отдельный webhook URL для provisioning.

### Payload Structure

```json
{
  "event": "provision_access",
  "sessionId": "test-session-001",
  "email": "user@example.com",
  "emailPaypal": "payer@example.com",
  "paymentDate": "2024-01-15T10:30:00Z"
}
```

### Make Scenario Steps

#### Step 1: Webhook Trigger
- **Module:** Webhooks → Custom webhook
- **Settings:**
  - Название: `Access Provisioning`
  - Метод: `POST`

#### Step 2: Get Session Data
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Get session data
SELECT 
  id,
  session_id,
  email_user,
  email_paypal,
  payment_date,
  status,
  plan,
  amount
FROM sessions
WHERE session_id = '{{webhook.sessionId}}';
```

#### Step 3: Determine Final Email
- **Module:** Set variables
- **Variables:**
  - `finalEmail`: `{{step2.email_user}}` (if exists) ELSE `{{step2.email_paypal}}`
  - `paymentDate`: `{{step2.payment_date}}`

#### Step 4: Calculate End Date
- **Module:** Tools → Date/Time formatter
- **Input:** `{{paymentDate}}`
- **Operation:** Add 60 days
- **Output:** `endDate`

#### Step 5: Send Access Email
- **Module:** Email → Send an email
- **Settings:**
  - **To:** `{{finalEmail}}`
  - **Subject:** `Access Granted - Your {{step2.plan}} Plan`
  - **Body:** (HTML или текст)
```
Hello,

Your payment has been confirmed and your access has been granted!

Plan: {{step2.plan}}
Amount: ${{step2.amount}}
Access Period: {{paymentDate}} to {{endDate}}

Your access credentials will be sent separately.

Thank you!
```

#### Step 6: Update Session Status
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Update session to completed
UPDATE sessions
SET
  status = 'COMPLETED'::session_status,
  end_date = '{{endDate}}'::timestamp,
  meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'accessGranted', true,
    'accessGrantedAt', NOW(),
    'endDate', '{{endDate}}'
  ),
  updated_at = NOW()
WHERE session_id = '{{webhook.sessionId}}'
RETURNING id;
```

#### Step 7: Log Access Granted Action
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Log access granted action
INSERT INTO actions (
  type,
  ref,
  session_id,
  payload,
  created_at
)
VALUES (
  'ACCESS_GRANTED'::action_type,
  '{{webhook.sessionId}}',
  '{{step6.id}}',
  jsonb_build_object(
    'email', '{{finalEmail}}',
    'endDate', '{{endDate}}',
    'plan', '{{step2.plan}}'
  ),
  NOW()
);
```

#### Step 8: Sync to Google Sheets (Optional)
- **Module:** Google Sheets → Add a row
- **Spreadsheet:** `Make Bot Users`
- **Sheet:** `Sheet1`
- **Row Data:**
  - `Session ID`: `{{webhook.sessionId}}`
  - `Email`: `{{finalEmail}}`
  - `Plan`: `{{step2.plan}}`
  - `Payment Date`: `{{paymentDate}}`
  - `End Date`: `{{endDate}}`
  - `Status`: `COMPLETED`

---

## 🔔 Scenario 4: Nightly Checks and Alerts

### Описание
Проверяет записи со статусом `PAID_PENDING_EMAIL` старше определенного времени и отправляет алерты.

### Trigger
- **Module:** Schedule → Schedule
- **Settings:**
  - **Frequency:** Daily
  - **Time:** `02:00` (2 AM)
  - **Timezone:** Your timezone

### Make Scenario Steps

#### Step 1: Schedule Trigger
- **Module:** Schedule → Schedule
- **Settings:** Daily at 2 AM

#### Step 2: Find Pending Records
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Find records with PAID_PENDING_EMAIL status older than 24 hours
SELECT 
  id,
  session_id,
  email_user,
  email_paypal,
  payment_date,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - payment_date)) / 3600 as hours_pending
FROM sessions
WHERE status = 'PAID_PENDING_EMAIL'::session_status
  AND payment_date < NOW() - INTERVAL '24 hours'
ORDER BY payment_date ASC;
```

#### Step 3: Router - Check if Records Found
- **Module:** Flow control → Router
- **Condition:**
  - Route 1: `{{step2}}` has items (records found)
  - Route 2: No items (no pending records)

#### Step 4: Send Telegram Alert (Route 1)
- **Module:** Telegram → Send a message
- **Settings:**
  - **Chat ID:** `{{ADMIN_TELEGRAM_CHAT_ID}}`
  - **Message:**
```
⚠️ Alert: Pending Email Records

Found {{step2.length}} records with PAID_PENDING_EMAIL status older than 24 hours.

Please check the admin panel:
{{ADMIN_PANEL_URL}}/payments?status=PAID_PENDING_EMAIL

Oldest record: {{step2[0].session_id}}
Payment date: {{step2[0].payment_date}}
```

#### Step 5: Log Alert Action
- **Module:** PostgreSQL → Execute a query
- **SQL Query:**
```sql
-- Log alert action
INSERT INTO actions (
  type,
  ref,
  payload,
  created_at
)
VALUES (
  'WEBHOOK_SENT'::action_type,
  'nightly_check',
  jsonb_build_object(
    'pendingRecords', {{step2.length}},
    'checkTime', NOW()
  ),
  NOW()
);
```

---

## 🔐 Environment Variables для Make

Создайте следующие переменные в Make:

- `MAKE_BOT_DB_HOST` - Database host
- `MAKE_BOT_DB_PORT` - Database port (5432)
- `MAKE_BOT_DB_NAME` - Database name (make_bot)
- `MAKE_BOT_DB_USER` - Database user
- `MAKE_BOT_DB_PASSWORD` - Database password
- `ADMIN_TELEGRAM_CHAT_ID` - Telegram chat ID для алертов
- `ADMIN_PANEL_URL` - URL админ-панели
- `SMTP_HOST` - SMTP host для отправки email
- `SMTP_USER` - SMTP user
- `SMTP_PASS` - SMTP password

---

## 📝 Важные замечания

### Business Rules в Make

1. **Final Email Logic:**
   ```
   finalEmail = email_user (if exists) ELSE email_paypal
   ```

2. **End Date Calculation:**
   ```
   endDate = paymentDate + 60 days (UTC)
   ```

3. **Status Flow:**
   ```
   STARTED → AWAITING_PAYMENT → PAID → COMPLETED
   ```

4. **Idempotency:**
   - Всегда проверяйте `txn_id` перед обработкой PayPal webhook
   - Используйте `ON CONFLICT` в PostgreSQL для upsert операций

### Error Handling

- Всегда логируйте ошибки в `actions` таблицу
- Используйте Router для обработки различных сценариев
- Добавьте retry логику для критических операций

### Testing

1. Протестируйте каждый сценарий с тестовыми данными
2. Проверьте обработку edge cases (дубликаты, отсутствующие данные)
3. Убедитесь, что все данные правильно сохраняются в БД

---

## ✅ Checklist для настройки

- [ ] Создано подключение к PostgreSQL в Make
- [ ] Создан Scenario 1: Bot Webhook Handler
- [ ] Создан Scenario 2: PayPal Webhook Handler
- [ ] Создан Scenario 3: Access Provisioning Module
- [ ] Создан Scenario 4: Nightly Checks and Alerts
- [ ] Настроены все webhook URL в Backend `.env`
- [ ] Протестированы все сценарии
- [ ] Настроены переменные окружения в Make
- [ ] Настроена отправка email (SMTP)
- [ ] Настроены Telegram алерты (опционально)

---

## 🚀 Следующие шаги

После настройки всех сценариев в Make:

1. Обновите `MAKE_WEBHOOK_URL` в Backend `.env`
2. Протестируйте полный flow:
   - Telegram bot → Email collection → Backend → Make
   - PayPal payment → Backend → Make → Provisioning
3. Проверьте логи в `actions` таблице
4. Убедитесь, что все данные синхронизируются правильно

