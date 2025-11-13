# Make Webhook Payloads Reference

## 📥 Входящие Webhook'и в Make

### 1. Bot Email Collection Webhook

**Endpoint:** `POST /api/webhook/bot` (Backend отправляет в Make)

**Payload:**
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

**Fields:**
- `event` (string): `"bot_email_collected"`
- `sessionId` (string): Уникальный ID сессии
- `email` (string): Email адрес пользователя
- `tgUserId` (string): Telegram user ID
- `firstName` (string, optional): Имя пользователя
- `lastName` (string, optional): Фамилия пользователя
- `plan` (string): `"BASIC" | "STANDARD" | "PREMIUM"`
- `amount` (number): Сумма платежа

---

### 2. PayPal Payment Webhook

**Endpoint:** `POST /api/webhook/paypal` (Backend отправляет в Make)

**Payload:**
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

**Fields:**
- `event` (string): `"paypal_payment_received"`
- `sessionId` (string): ID сессии из custom параметра PayPal
- `txnId` (string): PayPal transaction ID
- `emailPaypal` (string, optional): Email из PayPal аккаунта
- `amount` (number): Сумма платежа
- `currency` (string): Валюта (обычно "USD")
- `paymentDate` (string): ISO 8601 дата платежа
- `status` (string): `"completed" | "pending" | "refunded" | "failed"`

---

### 3. Access Provisioning Webhook

**Endpoint:** Внутренний webhook между Make сценариями

**Payload:**
```json
{
  "event": "provision_access",
  "sessionId": "test-session-001",
  "email": "user@example.com",
  "emailPaypal": "payer@example.com",
  "paymentDate": "2024-01-15T10:30:00Z"
}
```

**Fields:**
- `event` (string): `"provision_access"`
- `sessionId` (string): ID сессии
- `email` (string, optional): email_user если существует
- `emailPaypal` (string, optional): email_paypal если существует
- `paymentDate` (string): ISO 8601 дата платежа

---

## 📤 Исходящие Webhook'и из Backend

Backend API отправляет webhook'и в Make после обработки событий.

### Webhook URLs

Настройте в Backend `.env`:
```env
MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-url"
```

Или отдельные URL для разных событий:
```env
MAKE_WEBHOOK_URL_BOT="https://hook.us1.make.com/bot-webhook"
MAKE_WEBHOOK_URL_PAYPAL="https://hook.us1.make.com/paypal-webhook"
MAKE_WEBHOOK_URL_PROVISIONING="https://hook.us1.make.com/provisioning-webhook"
```

---

## 🔄 Примеры SQL запросов для Make

### Upsert Session

```sql
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
  'AWAITING_PAYMENT'::session_status,
  jsonb_build_object(
    'tgUserId', '{{webhook.tgUserId}}',
    'firstName', '{{webhook.firstName}}',
    'lastName', '{{webhook.lastName}}'
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

### Update Payment

```sql
UPDATE sessions
SET
  txn_id = '{{webhook.txnId}}',
  email_paypal = '{{webhook.emailPaypal}}',
  payment_date = '{{webhook.paymentDate}}'::timestamp,
  status = 'PAID'::session_status,
  updated_at = NOW()
WHERE session_id = '{{webhook.sessionId}}'
RETURNING id, session_id, status, payment_date;
```

### Calculate End Date

В Make используйте модуль Date/Time:
- Input: `{{paymentDate}}`
- Operation: Add 60 days
- Output: `endDate`

Или в SQL:
```sql
SELECT 
  payment_date + INTERVAL '60 days' as end_date
FROM sessions
WHERE session_id = '{{sessionId}}';
```

### Get Final Email

```sql
SELECT 
  COALESCE(email_user, email_paypal) as final_email
FROM sessions
WHERE session_id = '{{sessionId}}';
```

---

## 🧪 Тестовые данные

### Тестовый Bot Webhook

```bash
curl -X POST https://hook.us1.make.com/your-bot-webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "event": "bot_email_collected",
    "sessionId": "test-session-001",
    "email": "test@example.com",
    "tgUserId": "123456789",
    "firstName": "Test",
    "lastName": "User",
    "plan": "STANDARD",
    "amount": 99.99
  }'
```

### Тестовый PayPal Webhook

```bash
curl -X POST https://hook.us1.make.com/your-paypal-webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "event": "paypal_payment_received",
    "sessionId": "test-session-001",
    "txnId": "TEST-TXN-001",
    "emailPaypal": "payer@example.com",
    "amount": 99.99,
    "currency": "USD",
    "paymentDate": "2024-01-15T10:30:00Z",
    "status": "completed"
  }'
```

---

## 📊 Database Schema Reference

### Sessions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `session_id` | string | Unique session identifier |
| `txn_id` | string | PayPal transaction ID |
| `plan` | enum | BASIC, STANDARD, PREMIUM |
| `email_user` | string | Email from Telegram bot |
| `email_paypal` | string | Email from PayPal |
| `amount` | decimal | Payment amount |
| `currency` | string | Currency code |
| `status` | enum | Session status |
| `payment_date` | timestamp | Payment date |
| `end_date` | timestamp | Access end date |
| `meta` | jsonb | Additional metadata |

### Actions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `type` | enum | Action type |
| `ref` | string | Reference (session_id, txn_id) |
| `session_id` | uuid | Foreign key to sessions |
| `payload` | jsonb | Action data |
| `created_at` | timestamp | Action timestamp |

---

## ⚠️ Важные замечания

1. **Idempotency:** Всегда проверяйте `txn_id` перед обработкой PayPal платежей
2. **Final Email:** Используйте `COALESCE(email_user, email_paypal)` для определения final email
3. **End Date:** Рассчитывайте как `payment_date + 60 days` в UTC
4. **Error Handling:** Логируйте все ошибки в `actions` таблицу
5. **Retry Logic:** Backend уже имеет retry логику, но Make также должен обрабатывать ошибки

