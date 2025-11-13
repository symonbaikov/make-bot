# Implementation Plan: Telegram Bot + Web Interface

## Project Overview

**Objective:** Collect and validate user email addresses before/after payment, link them to payments/plans, synchronize data through Make, and provide Irina with an admin panel for control, statistics, and manual operations.

---

## 1. Technology Stack

### Backend (Node.js)

- **Runtime:** Node.js 18+ (LTS)
- **Framework:** Express.js или Fastify
- **Database:** PostgreSQL 14+
- **ORM:** Prisma или TypeORM
- **Authentication:** JWT (jsonwebtoken) + bcrypt для паролей
- **Validation:** Zod или Joi
- **HTTP Client:** Axios или node-fetch
- **Logging:** Winston или Pino
- **Environment:** dotenv

### Telegram Bot

- **Library:** Telegraf или node-telegram-bot-api
- **Webhook:** Express middleware для обработки webhook от Telegram
- **Email Validation:** validator.js + nodemailer для OTP

### Frontend (React)

- **Framework:** React 18+ или Next.js 14+ (SSR/SSG)
- **State Management:** React Query (TanStack Query) или Zustand
- **UI Library:** Material-UI (MUI) или Ant Design или Tailwind CSS + Headless UI
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios или Fetch API
- **Charts:** Recharts или Chart.js
- **Routing:** React Router (если чистый React) или Next.js Router
- **Authentication:** JWT в localStorage/sessionStorage или httpOnly cookies

### Payment Integration

- **PayPal SDK:** @paypal/checkout-server-sdk или paypal-rest-sdk
- **Webhook Verification:** PayPal IPN/Webhook signature verification

### Database & Infrastructure

- **Database:** PostgreSQL (Supabase/Railway/Neon/AWS RDS)
- **Migrations:** Prisma Migrate или TypeORM migrations
- **Connection Pooling:** pg-pool или Prisma connection pooling

### DevOps & Deployment

- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions или GitLab CI
- **Hosting:**
  - Bot: Render/Fly.io/Railway
  - Frontend: Vercel/Netlify/Render
  - Backend API: Render/Railway/Fly.io
- **Monitoring:** Sentry (error tracking), LogRocket (optional)

### Additional Tools

- **Email Service:** Nodemailer + SMTP (SendGrid/SES) или Resend
- **Task Queue:** BullMQ или node-cron для фоновых задач
- **File Export:** ExcelJS или csv-writer для экспорта данных
- **Date Handling:** date-fns или Day.js

---

## 2. Architecture

### Core Components

- **Telegram Bot** (Node.js + Telegraf)

  - Webhook-based
  - Email validation
  - Deep-link support with session_id

- **Backend API** (Node.js + Express/Fastify)

  - RESTful API endpoints
  - Webhook handlers (Telegram, PayPal)
  - Admin API with JWT authentication
  - Database operations via ORM

- **Make** (automation scenarios)

  - Webhooks from bot and PayPal
  - Database/Sheets write/update operations
  - Access provisioning
  - Email notifications

- **PostgreSQL Database**

  - User storage
  - Session management
  - Activity logs
  - Admin users

- **Web Panel** (React/Next.js)

  - Admin authentication
  - Dashboard and user lists
  - Statistics and management tools

- **Payment Integration**

  - PayPal (custom=session_id)
  - Webhook/IPN handling

- **Logging & Alerts**
  - Actions table
  - Telegram notifications

---

## 3. Step-by-Step Implementation Plan

### Phase 1: Project Setup & Database (День 1)

#### Step 1.1: Инициализация проекта

- [ ] Создать структуру проекта (monorepo или отдельные репозитории)
- [ ] Настроить package.json для backend и frontend
- [ ] Настроить TypeScript конфигурацию (tsconfig.json)
- [ ] Настроить ESLint и Prettier
- [ ] Создать .env.example файлы
- [ ] Инициализировать Git репозиторий

#### Step 1.2: Настройка базы данных PostgreSQL

- [ ] Создать базу данных (локально или в облаке)
- [ ] Настроить Prisma/TypeORM схему
- [ ] Создать миграции для таблиц:
  - `users`
  - `sessions` (payments)
  - `actions`
  - `web_users`
- [ ] Настроить ENUM типы (plan, status, action_type, role)
- [ ] Применить миграции
- [ ] Создать seed данные для тестирования

#### Step 1.3: Настройка окружения разработки

- [ ] Настроить Docker Compose для локальной БД (опционально)
- [ ] Настроить скрипты запуска (dev, build, start)
- [ ] Настроить переменные окружения

---

### Phase 2: Backend API Development (День 2-3)

#### Step 2.1: Базовая структура Backend API

- [ ] Создать структуру папок (controllers, services, models, middleware, utils)
- [ ] Настроить Express/Fastify сервер
- [ ] Настроить подключение к БД через ORM
- [ ] Настроить middleware (CORS, body-parser, error handling)
- [ ] Настроить логирование (Winston/Pino)
- [ ] Создать базовые утилиты (response helpers, error classes)

#### Step 2.2: Модели и сервисы данных

- [ ] Реализовать User модель и сервис
- [ ] Реализовать Session/Payment модель и сервис
- [ ] Реализовать Action модель и сервис
- [ ] Реализовать WebUser модель и сервис
- [ ] Создать методы CRUD операций
- [ ] Реализовать бизнес-логику (final email, end date calculation)

#### Step 2.3: Webhook endpoints

- [ ] Создать `POST /api/webhook/bot` endpoint
  - Валидация входных данных (Zod/Joi)
  - Upsert логика для sessions
  - Логирование в actions
  - Интеграция с Make (HTTP запрос)
- [ ] Создать `POST /api/webhook/paypal` endpoint
  - Верификация подписи PayPal
  - Обработка различных статусов платежа
  - Обновление session по session_id из custom параметра
  - Проверка на дубликаты по txn_id
  - Логирование в actions
  - Интеграция с Make

#### Step 2.4: Admin API endpoints

- [ ] Создать `POST /api/admin/auth/login` endpoint
  - Валидация email/password
  - Проверка через bcrypt
  - Генерация JWT токена
- [ ] Создать middleware для проверки JWT
- [ ] Создать `GET /api/admin/payments` endpoint
  - Фильтрация (status, plan, date range)
  - Поиск (email, session_id, txn_id)
  - Пагинация
  - Сортировка
- [ ] Создать `GET /api/admin/payments/:id` endpoint
- [ ] Создать `POST /api/admin/payments/:id/resend` endpoint
- [ ] Создать `PUT /api/admin/payments/:id/email` endpoint
- [ ] Создать `GET /api/admin/stats` endpoint
  - Conversion funnel
  - Revenue by plan
  - Trends over time
- [ ] Создать `GET /api/admin/actions` endpoint (activity log)
- [ ] Создать `POST /api/admin/sessions` endpoint (manual session creation)
- [ ] Создать `GET /api/admin/export` endpoint (CSV/Excel export)

#### Step 2.5: Интеграция с Make

- [ ] Создать сервис для отправки webhook в Make
- [ ] Реализовать retry логику для failed requests
- [ ] Добавить обработку ошибок

---

### Phase 3: Telegram Bot Development (День 3-4)

#### Step 3.1: Базовая настройка бота

- [ ] Создать Telegram бота через BotFather
- [ ] Настроить Telegraf/node-telegram-bot-api
- [ ] Настроить webhook для бота (или polling для разработки)
- [ ] Создать структуру папок (handlers, middleware, utils)
- [ ] Настроить подключение к Backend API

#### Step 3.2: Обработчики команд и сообщений

- [ ] Реализовать `/start` handler с поддержкой session_id
  - Проверка валидности session_id через API
  - Приветственное сообщение
  - Переход к запросу email
- [ ] Реализовать обработку текстовых сообщений (email input)
  - Валидация email формата (validator.js)
  - Сохранение email в состояние пользователя
  - Запрос подтверждения или переход к OTP
- [ ] Реализовать OTP функционал (опционально)
  - Генерация OTP кода
  - Отправка email с OTP через nodemailer
  - Проверка введенного кода
- [ ] Реализовать отправку данных в Backend API
  - POST запрос с session_id, email, tg_user_id
  - Обработка ответа от API
  - Генерация PayPal ссылки с custom=session_id
  - Отправка ссылки пользователю

#### Step 3.3: Обработка состояний и сценариев

- [ ] Реализовать state management (контекст или база данных)
- [ ] Обработка случая, когда платеж уже совершен
- [ ] Обработка невалидного/истекшего session_id
- [ ] Обработка ошибок и fallback сценарии
- [ ] Добавить кнопки и inline клавиатуры

#### Step 3.4: Интеграция с Backend API

- [ ] Создать HTTP клиент для взаимодействия с API
- [ ] Реализовать проверку статуса платежа
- [ ] Реализовать отправку webhook данных

---

### Phase 4: Frontend Development (День 4-6)

#### Step 4.1: Инициализация Frontend проекта

- [ ] Создать React/Next.js проект
- [ ] Настроить структуру папок (components, pages, hooks, services, utils)
- [ ] Настроить UI библиотеку (MUI/Ant Design/Tailwind)
- [ ] Настроить React Query для data fetching
- [ ] Настроить React Router (если чистый React)
- [ ] Настроить Axios/Fetch для API запросов

#### Step 4.2: Система аутентификации

- [ ] Создать страницу логина (`/login`)
  - Форма с email и password
  - Валидация через React Hook Form + Zod
  - Отправка запроса на `/api/admin/auth/login`
  - Сохранение JWT токена
- [ ] Создать Auth Context/Provider
- [ ] Создать Protected Route компонент
- [ ] Реализовать автоматический logout при истечении токена
- [ ] Создать страницу выхода

#### Step 4.3: Dashboard страница

- [ ] Создать layout с навигацией
- [ ] Реализовать Dashboard компонент (`/dashboard`)
  - Карточки с ключевыми метриками
  - Conversion funnel график (Recharts)
  - Revenue by plan график
  - Trends график (временной ряд)
- [ ] Настроить React Query для загрузки статистики
- [ ] Добавить фильтры по датам

#### Step 4.4: Список платежей/сессий

- [ ] Создать страницу списка (`/payments`)
  - Таблица с данными (MUI Table или Ant Design Table)
  - Колонки: ID, Session ID, Email, Plan, Amount, Status, Date
  - Пагинация
  - Сортировка по колонкам
- [ ] Реализовать фильтры
  - По статусу (dropdown)
  - По плану (dropdown)
  - По дате (date picker)
  - По email (search input)
- [ ] Реализовать поиск (session_id, txn_id, email)
- [ ] Добавить кнопку экспорта (CSV/Excel)

#### Step 4.5: Детали платежа/сессии

- [ ] Создать страницу деталей (`/payments/:id`)
  - Отображение всех полей записи
  - Показ обоих email (email_user и email_paypal) с источниками
  - Отображение meta данных (JSON viewer)
  - История действий (actions log)
- [ ] Реализовать действия:
  - Кнопка "Resend Email" (модальное окно подтверждения)
  - Кнопка "Grant Access" (модальное окно подтверждения)
  - Редактирование email (inline edit или модальное окно)
- [ ] Добавить кнопку "Back to list"

#### Step 4.6: Activity Log страница

- [ ] Создать страницу логов (`/actions`)
  - Таблица с действиями
  - Фильтры по типу действия
  - Фильтры по дате
  - Поиск по ref (session_id, txn_id, user_id)
  - Отображение payload (expandable row)

#### Step 4.7: Ручное создание сессии

- [ ] Создать страницу создания сессии (`/sessions/create`)
  - Форма с полями: plan, amount, currency
  - Генерация session_id
  - Создание записи через API
  - Отображение созданной ссылки на бота

#### Step 4.8: Общие компоненты и утилиты

- [ ] Создать компоненты: Loading, Error, Empty State
- [ ] Создать утилиты для форматирования дат, валют
- [ ] Настроить обработку ошибок (error boundaries)
- [ ] Добавить toast уведомления (react-toastify или MUI Snackbar)

---

### Phase 5: Make Automation Scenarios (День 6-7)

#### Step 5.1: Webhook от бота

- [ ] Создать сценарий в Make для приема webhook от бота
- [ ] Настроить HTTP модуль для приема данных
- [ ] Реализовать логику upsert в PostgreSQL через Make модуль
- [ ] Сохранение email_user
- [ ] Логирование события в actions таблицу
- [ ] Триггер на provisioning (если платеж уже есть)

#### Step 5.2: Webhook от PayPal

- [ ] Создать сценарий в Make для приема webhook от PayPal
- [ ] Настроить верификацию подписи PayPal
- [ ] Извлечение session_id из custom параметра
- [ ] Поиск записи по session_id
- [ ] Обновление статуса, txn_id, email_paypal
- [ ] Проверка на дубликаты по txn_id
- [ ] Логирование события

#### Step 5.3: Access Provisioning модуль

- [ ] Создать общий модуль для provisioning
- [ ] Определение final email (email_user OR email_paypal)
- [ ] Расчет end_date (payment_date + 60 days)
- [ ] Отправка email с доступом (через email модуль Make)
- [ ] Обновление статуса на "completed"
- [ ] Логирование события "access_granted"
- [ ] Синхронизация с Google Sheets (если требуется)

#### Step 5.4: Ночные проверки и алерты

- [ ] Создать сценарий для ночных проверок (cron)
- [ ] Поиск записей со статусом "paid_pending_email" старше N часов
- [ ] Отправка Telegram уведомления администратору
- [ ] Логирование в actions

---

### Phase 6: Testing & Integration (День 7-8)

#### Step 6.1: Unit тесты

- [ ] Написать тесты для Backend сервисов
- [ ] Написать тесты для утилит
- [ ] Написать тесты для валидации

#### Step 6.2: Integration тесты

- [ ] Протестировать полный flow: создание сессии → бот → email → платеж
- [ ] Протестировать webhook endpoints
- [ ] Протестировать Admin API endpoints
- [ ] Протестировать обработку ошибок

#### Step 6.3: E2E тестирование

- [ ] Протестировать пользовательский сценарий через Telegram бота
- [ ] Протестировать Admin панель (логин, просмотр, действия)
- [ ] Протестировать экспорт данных

#### Step 6.4: Тестирование интеграций

- [ ] Протестировать интеграцию с Make (webhooks)
- [ ] Протестировать PayPal webhook (sandbox)
- [ ] Протестировать отправку email

---

### Phase 7: Security & Optimization (День 8)

#### Step 7.1: Безопасность

- [ ] Настроить HTTPS для всех endpoints
- [ ] Реализовать rate limiting для API
- [ ] Настроить CORS правильно
- [ ] Проверить SQL injection защиту (ORM должен защищать)
- [ ] Настроить helmet.js для Express
- [ ] Реализовать валидацию всех входных данных
- [ ] Настроить secure хранение секретов (environment variables)

#### Step 7.2: Оптимизация

- [ ] Оптимизировать запросы к БД (индексы, запросы)
- [ ] Настроить кэширование для статистики (Redis опционально)
- [ ] Оптимизировать bundle size фронтенда
- [ ] Настроить compression для API ответов

---

### Phase 8: Deployment & Documentation (День 9-10)

#### Step 8.1: Подготовка к деплою

- [ ] Создать Dockerfile для Backend
- [ ] Создать Dockerfile для Frontend (если нужен)
- [ ] Создать docker-compose.yml для локальной разработки
- [ ] Настроить production environment variables
- [ ] Настроить production базу данных

#### Step 8.2: CI/CD настройка

- [ ] Настроить GitHub Actions/GitLab CI
- [ ] Настроить автоматические тесты в CI
- [ ] Настроить автоматический деплой на staging
- [ ] Настроить деплой на production (manual или автоматический)

#### Step 8.3: Деплой компонентов

- [ ] Задеплоить Backend API (Render/Railway/Fly.io)
- [ ] Задеплоить Telegram Bot (Render/Fly.io)
- [ ] Задеплоить Frontend (Vercel/Netlify)
- [ ] Настроить домены и SSL сертификаты
- [ ] Настроить webhook URLs в Telegram и PayPal

#### Step 8.4: Настройка Make сценариев

- [ ] Настроить webhook URLs в Make сценариях
- [ ] Протестировать все сценарии в Make
- [ ] Настроить алерты в Make

#### Step 8.5: Документация

- [ ] Написать README с инструкциями по установке
- [ ] Документировать API endpoints (Swagger/OpenAPI опционально)
- [ ] Создать документацию для админов (как использовать панель)
- [ ] Документировать переменные окружения
- [ ] Создать troubleshooting guide

#### Step 8.6: Мониторинг и алерты

- [ ] Настроить Sentry для error tracking
- [ ] Настроить логирование в production
- [ ] Настроить мониторинг uptime (UptimeRobot или аналог)
- [ ] Настроить алерты для критических ошибок

---

## 4. Data Flow A: Email BEFORE Payment (Priority)

1. User clicks "Buy" → Create `session_id` and draft record (`status=started`)
2. Open bot via deep-link: `https://t.me/<bot>?start=<session_id>`
3. Bot requests email and validates (OTP if necessary)
4. Bot → Make: `{session_id, email, tg_user_id}` → Save as `email_user`
5. Bot returns PayPal link with `custom=session_id`
6. PayPal webhook → Make finds `session_id`, marks as `paid`, prioritizes `email_user`, grants access and sends email

---

## 4.1. Data Flow B: Email AFTER Payment

7. Payment received → Make records as `status=paid_pending_email`
8. Show link to bot/form for email confirmation
9. Bot/form submits email → Make completes record and grants access

---

## 5. Database Schema (PostgreSQL)

### `users` Table

| Column       | Type      | Constraints      |
| ------------ | --------- | ---------------- |
| `id`         | uuid      | PRIMARY KEY      |
| `email`      | varchar   | UNIQUE           |
| `first_name` | varchar   | NULLABLE         |
| `last_name`  | varchar   | NULLABLE         |
| `tg_user_id` | bigint    | UNIQUE, NULLABLE |
| `created_at` | timestamp |                  |
| `updated_at` | timestamp |                  |

### `sessions` / `payments` Table

| Column         | Type      | Constraints                                   |
| -------------- | --------- | --------------------------------------------- |
| `id`           | uuid      | PRIMARY KEY                                   |
| `session_id`   | varchar   | UNIQUE                                        |
| `txn_id`       | varchar   | UNIQUE, NULLABLE                              |
| `plan`         | enum      | basic/standard/premium                        |
| `email_user`   | varchar   | NULLABLE                                      |
| `email_paypal` | varchar   | NULLABLE                                      |
| `amount`       | decimal   |                                               |
| `currency`     | varchar   |                                               |
| `status`       | enum      | started/awaiting_payment/paid/refunded/failed |
| `meta`         | jsonb     |                                               |
| `created_at`   | timestamp |                                               |
| `updated_at`   | timestamp |                                               |

### `actions` Table (Activity Log)

| Column       | Type      | Description                                                  |
| ------------ | --------- | ------------------------------------------------------------ |
| `id`         | uuid      | PRIMARY KEY                                                  |
| `type`       | enum      | webhook_in/email_sent/access_granted/error/manual_fix/refund |
| `ref`        | varchar   | session_id/txn_id/user_id                                    |
| `payload`    | jsonb     | Event details                                                |
| `created_at` | timestamp |                                                              |

### `web_users` Table (Admin)

| Column          | Type      | Constraints |
| --------------- | --------- | ----------- |
| `id`            | uuid      | PRIMARY KEY |
| `email`         | varchar   | UNIQUE      |
| `password_hash` | varchar   |             |
| `role`          | enum      | admin       |
| `created_at`    | timestamp |             |

---

## 6. Telegram Bot Scenarios

### Main Flow

- `/start <session_id>` → Verify session and greet user
- Request and validate email (+ optional OTP)
- Send webhook to Make with `session_id` and `email`
- Return payment link or access confirmation if payment already exists

### Fallback Scenarios

- **No Telegram:** Provide link to web form for email confirmation
- **Expired/Invalid Session:** Show instructions and support contact

---

## 7. Make Automation Scenarios

### Key Scenarios

- **Bot Webhook:** Upsert record, save `email_user`, trigger access provisioning
- **PayPal Webhook/IPN:** Update status, `email_paypal`, `txn_id`, trigger access provisioning
- **Access Provisioning Module:**
  - Final email = `email_user` OR `email_paypal`
  - Send email + mark as complete
- **Nightly Checks:** Monitor pending records and send Telegram alerts

---

## 8. Admin Web Panel (React/Next.js)

### Features

- **Authentication:** Admin login (email + password), session management
- **Dashboard:**
  - Conversion funnel (start → email → payment)
  - Revenue by plan
  - Trends and analytics
- **Payment/Session List:**
  - Filters (status/date/plan/email source)
  - Search functionality
- **Record Details:**
  - View full payload
  - Actions: "Resend email/Grant access"
  - Edit email
- **Activity Log:** Full event journal
- **Export:** CSV/Excel export
- **Manual Operations:** Create test/offline sessions

---

## 9. Google Sheets Integration (Optional)

### Synchronized Data

- Name
- Email (final)
- Plan
- Payment Date
- End Date
- Transaction ID
- Payer ID
- Tariff Code

### Anti-Duplicate Logic

- Search by `session_id`/`txn_id` before insertion
- Store email source separately (user/paypal)

---

## 10. Security Measures

- **User Consent:** Data processing policy in bot
- **HTTPS:** All communications encrypted
- **Secret Management:** Store in `.env` / Secrets Manager
- **PayPal Verification:** Signature validation, idempotency by `txn_id`
- **Access Control:** Role-based permissions, audit trail in admin panel

---

## 11. Infrastructure & Deployment

### Bot Hosting

- Platform: Render/Fly.io/VM
- Auto-deploy from Git

### Admin Panel

- Frontend: Vercel/Render
- Database: Supabase/Neon/Railway

### Make

- Clear scenario naming
- Alert configuration
- Regular backups

### Backups

- Database backups
- Daily reports

---

## 12. Development Timeline (Estimated)

| Phase                               | Duration | Description                                   |
| ----------------------------------- | -------- | --------------------------------------------- |
| Phase 1: Project Setup & Database   | 1 day    | Инициализация проекта, настройка БД, миграции |
| Phase 2: Backend API Development    | 2 days   | REST API, webhooks, admin endpoints           |
| Phase 3: Telegram Bot Development   | 2 days   | Бот логика, обработчики, интеграция с API     |
| Phase 4: Frontend Development       | 3 days   | Admin панель, dashboard, списки, детали       |
| Phase 5: Make Automation Scenarios  | 2 days   | Webhook сценарии, provisioning, алерты        |
| Phase 6: Testing & Integration      | 2 days   | Unit, integration, E2E тесты                  |
| Phase 7: Security & Optimization    | 1 day    | Безопасность, оптимизация производительности  |
| Phase 8: Deployment & Documentation | 2 days   | Деплой, CI/CD, документация, мониторинг       |

**Total:** ~15 дней (3 недели)

---

## 13. Risks & Mitigation

### Potential Issues

| Risk                         | Mitigation                                                     |
| ---------------------------- | -------------------------------------------------------------- |
| Conversion loss at bot step  | Minimize steps, explain benefits, provide web form alternative |
| Duplicates/desynchronization | Use `custom=session_id`, strict upsert logic                   |
| PayPal delays                | Implement retries, queues, timeout alerts                      |

---

## 14. API Draft

### Endpoints

#### `POST /api/webhook/bot`

**Body:** `{ session_id, email, tg_user_id }`

**Action:** Upsert record, log event, trigger access provisioning

#### `POST /api/webhook/paypal`

**Body:** Raw webhook/IPN from PayPal

**Action:** Verify signature → Update status → Trigger access provisioning

#### `GET /api/admin/payments`

**Query Parameters:** Filters, search, pagination

**Returns:** Payment list for admin panel

#### `POST /api/admin/payments/:id/resend`

**Action:** Resend email/access, log to journal

---

## 15. Business Rules & Formulas

### Calculations

- **End Date:** `addDays(Payment Date, 60)` (UTC, calculated once in Make)
- **Final Email:** `email_user` (if exists) ELSE `email_paypal`

### Display Rules

- Show both emails in admin panel with their sources

---

## 16. Client Requirements

### Content Needed

- Bot texts (greeting, instructions, buttons)
- Email templates (payment confirmation, access granted)

### Access Required

- PayPal webhooks/IPN credentials
- Google Sheets access
- Make account access
- Domain/hosting for admin panel (if custom domain needed)

---

## Summary

This implementation plan provides a robust system for:

- ✅ Collecting validated email addresses
- ✅ Linking emails to payments and plans
- ✅ Automating access provisioning
- ✅ Providing comprehensive admin controls
- ✅ Maintaining data integrity and security
- ✅ Enabling manual interventions when needed

The system prioritizes user-provided emails while maintaining PayPal email as fallback, ensures data synchronization across platforms, and provides Irina with powerful tools for monitoring and management.
