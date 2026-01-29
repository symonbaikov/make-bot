# Make SQL Queries Reference

## 📋 Готовые SQL запросы для использования в Make

Все запросы используют переменные из предыдущих модулей Make (например, `{{webhook.sessionId}}`).

---

## 🔵 Scenario 1: Bot Webhook Handler

### Query 1: Upsert Session

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
    'firstName', COALESCE('{{webhook.firstName}}', ''),
    'lastName', COALESCE('{{webhook.lastName}}', ''),
    'source', 'telegram_bot'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (session_id) 
DO UPDATE SET
  email_user = EXCLUDED.email_user,
  meta = COALESCE(sessions.meta, '{}'::jsonb) || EXCLUDED.meta,
  updated_at = NOW()
RETURNING id, session_id, status, payment_date;
```

### Query 2: Upsert User

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
  NULLIF('{{webhook.firstName}}', ''),
  NULLIF('{{webhook.lastName}}', ''),
  NOW(),
  NOW()
)
ON CONFLICT (tg_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  first_name = COALESCE(EXCLUDED.first_name, users.first_name),
  last_name = COALESCE(EXCLUDED.last_name, users.last_name),
  updated_at = NOW()
RETURNING id;
```

### Query 3: Log Email Collection Action

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
    'tgUserId', '{{webhook.tgUserId}}',
    'firstName', '{{webhook.firstName}}',
    'lastName', '{{webhook.lastName}}'
  ),
  NOW()
)
RETURNING id;
```

### Query 4: Check Payment Status (для Router)

```sql
-- Check if payment already exists
SELECT 
  id,
  session_id,
  status,
  payment_date,
  email_user,
  email_paypal
FROM sessions
WHERE session_id = '{{webhook.sessionId}}';
```

---

## 💳 Scenario 2: PayPal Webhook Handler

### Query 1: Check for Duplicate Transaction

```sql
-- Check if transaction already exists
SELECT 
  id,
  session_id,
  txn_id,
  status,
  payment_date
FROM sessions
WHERE txn_id = '{{webhook.txnId}}';
```

### Query 2: Update Session with Payment

```sql
-- Update session with payment information
UPDATE sessions
SET
  txn_id = '{{webhook.txnId}}',
  email_paypal = NULLIF('{{webhook.emailPaypal}}', ''),
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
    'paypalEmail', '{{webhook.emailPaypal}}',
    'updatedAt', NOW()
  ),
  updated_at = NOW()
WHERE session_id = '{{webhook.sessionId}}'
RETURNING 
  id, 
  session_id, 
  status, 
  payment_date, 
  email_user, 
  email_paypal,
  plan,
  amount;
```

### Query 3: Log Payment Received Action

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
  (SELECT id FROM sessions WHERE session_id = '{{webhook.sessionId}}'),
  jsonb_build_object(
    'txnId', '{{webhook.txnId}}',
    'emailPaypal', '{{webhook.emailPaypal}}',
    'amount', {{webhook.amount}},
    'currency', '{{webhook.currency}}',
    'paymentDate', '{{webhook.paymentDate}}',
    'status', '{{webhook.status}}'
  ),
  NOW()
)
RETURNING id;
```

---

## ✅ Scenario 3: Access Provisioning

### Query 1: Get Session Data

```sql
-- Get session data for provisioning
SELECT 
  id,
  session_id,
  email_user,
  email_paypal,
  payment_date,
  status,
  plan,
  amount,
  currency,
  meta
FROM sessions
WHERE session_id = '{{webhook.sessionId}}';
```

### Query 2: Determine Final Email (в Set Variables модуле)

В Make используйте модуль **Set variables**:
- Variable name: `finalEmail`
- Value: `{{step1.email_user}}` (если не пусто) ELSE `{{step1.email_paypal}}`

Или в SQL:
```sql
-- Get final email
SELECT 
  COALESCE(email_user, email_paypal) as final_email,
  payment_date,
  plan,
  amount
FROM sessions
WHERE session_id = '{{webhook.sessionId}}';
```

### Query 3: Calculate End Date

В Make используйте модуль **Date/Time formatter**:
- Input: `{{step1.payment_date}}`
- Operation: Add 60 days
- Output: `endDate`

Или в SQL:
```sql
-- Calculate end date
SELECT 
  payment_date + INTERVAL '60 days' as end_date
FROM sessions
WHERE session_id = '{{webhook.sessionId}}';
```

### Query 4: Update Session to Completed

```sql
-- Update session to completed status
UPDATE sessions
SET
  status = 'COMPLETED'::session_status,
  end_date = '{{endDate}}'::timestamp,
  meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'accessGranted', true,
    'accessGrantedAt', NOW(),
    'endDate', '{{endDate}}',
    'finalEmail', '{{finalEmail}}'
  ),
  updated_at = NOW()
WHERE session_id = '{{webhook.sessionId}}'
RETURNING id, session_id, status, end_date;
```

### Query 5: Log Access Granted Action

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
  (SELECT id FROM sessions WHERE session_id = '{{webhook.sessionId}}'),
  jsonb_build_object(
    'email', '{{finalEmail}}',
    'endDate', '{{endDate}}',
    'plan', '{{step1.plan}}',
    'amount', {{step1.amount}},
    'provisionedAt', NOW()
  ),
  NOW()
)
RETURNING id;
```

---

## 🔔 Scenario 4: Nightly Checks

### Query 1: Find Pending Records

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

### Query 2: Log Alert Action

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
    'pendingRecords', {{step1.length}},
    'checkTime', NOW(),
    'oldestRecord', '{{step1[0].session_id}}',
    'oldestPaymentDate', '{{step1[0].payment_date}}'
  ),
  NOW()
)
RETURNING id;
```

---

## 🔍 Utility Queries

### Get Session by Session ID

```sql
SELECT 
  id,
  session_id,
  txn_id,
  plan,
  email_user,
  email_paypal,
  amount,
  currency,
  status,
  payment_date,
  end_date,
  meta,
  created_at,
  updated_at
FROM sessions
WHERE session_id = '{{sessionId}}';
```

### Get Actions for Session

```sql
SELECT 
  id,
  type,
  ref,
  payload,
  created_at
FROM actions
WHERE session_id = (
  SELECT id FROM sessions WHERE session_id = '{{sessionId}}'
)
ORDER BY created_at DESC;
```

### Check if Email Exists

```sql
SELECT 
  CASE 
    WHEN email_user IS NOT NULL THEN email_user
    WHEN email_paypal IS NOT NULL THEN email_paypal
    ELSE NULL
  END as final_email
FROM sessions
WHERE session_id = '{{sessionId}}';
```

---

## ⚠️ Важные замечания

1. **Типы данных:** Убедитесь, что используете правильные типы (`::plan`, `::session_status`, `::action_type`)
2. **NULL значения:** Используйте `COALESCE()` и `NULLIF()` для обработки NULL
3. **JSONB:** Используйте `jsonb_build_object()` для создания JSON объектов
4. **Timestamps:** Используйте `NOW()` для текущего времени
5. **Intervals:** Используйте `INTERVAL '60 days'` для добавления дней

---

## 🧪 Тестирование запросов

Перед использованием в Make, протестируйте запросы в PostgreSQL:

```sql
-- Пример тестового запроса
SELECT * FROM sessions WHERE session_id = 'test-session-001';
```

Или используйте Prisma Studio:
```bash
cd backend
npm run db:studio
```

