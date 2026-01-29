# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Make Bot is a Telegram bot + web interface system for email collection and payment management. The system integrates Telegram bot, PayPal payments, and a web admin panel to manage user sessions and access provisioning.

**Key Integration Flow:**
1. User starts bot with `session_id` → collects email/name/phone via Telegram
2. PayPal payment webhook → links payment to session via `custom=session_id`
3. Both email + payment complete → triggers Make.com webhook for access provisioning
4. Access granted → updates session to `COMPLETED` status

## Technology Stack

### Backend (`/backend`)
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 14+ with Prisma ORM
- **Auth:** JWT with bcrypt password hashing
- **Validation:** Zod schemas
- **Logging:** Winston

### Telegram Bot (`/bot`)
- **Library:** Telegraf
- **Validation:** validator.js for email, custom phone validation
- **State:** Session middleware (in-memory + database persistence)

### Frontend (`/frontend`)
- **Framework:** React 18 with Vite
- **Routing:** React Router DOM
- **State:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **UI:** Tailwind CSS
- **Charts:** Recharts

## Development Commands

### Root-level (run from `/Users/symonbaikov/make-bot`)
```bash
# Install all dependencies across workspaces
npm install

# Start all services in development mode
npm run dev

# Build all services
npm run build

# Lint all code
npm run lint

# Format all code
npm run format
```

### Backend-specific (`/backend`)
```bash
cd backend

# Development with hot reload
npm run dev

# Database operations
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes (dev)
npm run db:migrate       # Create migration (dev)
npm run db:migrate:deploy  # Apply migrations (production)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed database with test data

# Build and run
npm run build
npm start
```

### Bot-specific (`/bot`)
```bash
cd bot

# Development with hot reload
npm run dev

# Build and run
npm run build
npm start
```

### Frontend-specific (`/frontend`)
```bash
cd frontend

# Development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Docker Development
```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# PostgreSQL runs on localhost:5433 (not default 5432)
```

## Project Structure

This is a monorepo with npm workspaces:

```
make-bot/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── controllers/    # Request handlers (admin, webhook)
│   │   ├── services/       # Business logic layer
│   │   ├── middleware/     # Express middleware (auth, error handling, rate limiting)
│   │   ├── routes/         # Route definitions (admin, webhook)
│   │   ├── validators/     # Zod validation schemas
│   │   ├── utils/          # Helpers (logger, errors, response formatters)
│   │   └── types/          # TypeScript type definitions
│   └── prisma/
│       ├── schema.prisma   # Database schema (source of truth)
│       └── seed.ts         # Database seeding script
├── bot/              # Telegram bot
│   └── src/
│       ├── handlers/       # Bot command/message handlers
│       ├── middleware/     # Session middleware
│       └── utils/          # API client, validators, PayPal helpers
└── frontend/         # React admin panel
    └── src/
        ├── components/     # Reusable UI components
        ├── pages/          # Route pages
        ├── hooks/          # Custom React hooks
        └── services/       # API client functions
```

## Database Architecture

**Schema Location:** `backend/prisma/schema.prisma`

### Key Tables

**`users`** - End users (Telegram users)
- Links to sessions via `userId`
- Stores: email, firstName, lastName, phoneNumber, tgUserId

**`sessions`** - Payment/access sessions (core table)
- `sessionId`: Unique session identifier (passed to bot & PayPal)
- `txnId`: PayPal transaction ID (for idempotency)
- `emailUser`: Email collected from bot (priority)
- `emailPaypal`: Email from PayPal (fallback)
- `status`: Flow: `STARTED` → `AWAITING_PAYMENT` → `PAID` → `COMPLETED`
- `plan`: BASIC | STANDARD | PREMIUM
- `meta`: JSONB field for flexible data storage

**`actions`** - Audit log for all events
- Tracks: SESSION_CREATED, EMAIL_COLLECTED, PAYMENT_RECEIVED, ACCESS_GRANTED, etc.
- `ref`: Contains session_id/txn_id/user_id for traceability
- `payload`: JSONB with event details

**`web_users`** - Admin panel users
- Separate from end users
- Role-based: ADMIN | MANAGER

### Critical Business Rules

1. **Final Email Priority:** `emailUser` (if exists) ELSE `emailPaypal`
2. **End Date Calculation:** Payment Date + 60 days (handled by Make.com)
3. **Session Status Flow:** Never skip states - must go in order
4. **Idempotency:** Check `txnId` to prevent duplicate PayPal webhooks
5. **Session Linking:** PayPal sends `custom=session_id` parameter

## API Architecture

### Webhook Endpoints (`/api/webhook`)
- `POST /api/webhook/bot` - Handles Telegram bot data collection
- `POST /api/webhook/paypal` - Handles PayPal payment notifications

### Admin Endpoints (`/api/admin`)
All admin routes require JWT authentication via `auth` middleware.

- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/payments` - List sessions (with filters, search, pagination)
- `GET /api/admin/payments/:id` - Session details
- `PUT /api/admin/payments/:id/email` - Update email
- `POST /api/admin/payments/:id/resend` - Resend access email
- `POST /api/admin/payments/:id/grant-access` - Manually grant access
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/actions` - Activity log
- `POST /api/admin/sessions` - Create manual session
- `GET /api/admin/export` - Export data as CSV

**Response Format:** All endpoints return:
```typescript
{ success: boolean, data?: any, error?: string }
```

## Code Patterns

### Services Layer Pattern
Services contain business logic and database operations. Controllers call services.

```typescript
// backend/src/services/session-service.ts
export class SessionService {
  async findBySessionId(sessionId: string): Promise<Session | null>
  async create(data): Promise<Session>
  async updateStatus(sessionId: string, status: SessionStatus): Promise<Session>
}

// backend/src/controllers/webhook-controller.ts
const session = await sessionService.findBySessionId(sessionId);
```

### Error Handling Pattern
- Custom error classes in `utils/errors.ts`: `ValidationError`, `NotFoundError`, `UnauthorizedError`
- Centralized error handler middleware logs and formats errors
- Use `asyncHandler` wrapper for async route handlers

### Validation Pattern
- Zod schemas in `validators/` directory
- Validate at controller level before calling services
- Example: `validators/admin-validators.ts`, `validators/webhook-validators.ts`

### Logging Pattern
Winston logger configured in `utils/logger.ts`:
```typescript
logger.info('message', { contextData });
logger.error('error message', error);
```

All important events (webhooks, payments, errors) are logged both to Winston and `actions` table.

## Telegram Bot Architecture

### Session Management
Bot uses session middleware (`middleware/session-middleware.ts`) that stores state in memory during conversation flow.

**State flags:**
- `waitingForEmail`: Bot expects email input
- `waitingForFirstName`: Bot expects first name
- `waitingForLastName`: Bot expects last name
- `waitingForPhoneNumber`: Bot expects phone number

### Deep Links
Bot supports deep links with session_id:
```
https://t.me/<bot_username>?start=<session_id>
```

When user clicks link, `/start` handler validates session_id with backend API before starting data collection.

### Data Flow
1. User starts bot with session_id
2. Bot validates session exists via API
3. Collects: firstName → lastName → email → phoneNumber
4. Sends all data to backend webhook: `POST /api/webhook/bot`
5. Backend creates/updates user and session records
6. Backend triggers Make.com webhook for further processing

## Make.com Integration

Backend sends webhooks to Make.com for access provisioning:

**Webhook sent after:**
- Email collection from bot (`EMAIL_COLLECTED` action)
- PayPal payment received (`PAYMENT_RECEIVED` action)

**Make.com responsibilities:**
- Calculate end date (payment date + 60 days)
- Send access email to user
- Update session status to COMPLETED
- Handle edge cases (payment without email, email without payment)

**Retry Logic:** Backend implements retry logic for failed webhook calls (logged in `actions` table as `WEBHOOK_FAILED`).

## Authentication & Security

### Admin Authentication
- JWT tokens stored in localStorage/cookies
- `auth` middleware validates JWT on all `/api/admin/*` routes
- Passwords hashed with bcrypt (10 salt rounds)
- Token expiration handled with refresh mechanism

### Bot Authentication
- Bot requires login/password for admin commands
- Uses same JWT mechanism as web app
- Verifies against `web_users` table

### PayPal Webhook Security
- Verify PayPal webhook signatures before processing
- Idempotency check via `txnId` to prevent duplicate processing
- Extract `session_id` from `custom` parameter

### Rate Limiting
Applied to all `/api/*` routes via `middleware/rate-limiter.ts`

## Testing

The codebase follows test-driven patterns:

- **Unit tests:** Test services and utilities independently
- **Integration tests:** Test API endpoints with test database
- **E2E tests:** Test full user flows

Run tests from workspace root or individual service directories.

## Deployment

### Environment Variables
Required env vars documented in `.env.example` files in each service directory.

**Backend:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `CORS_ORIGIN` - Frontend URL
- `MAKE_WEBHOOK_URL` - Make.com webhook URL
- `PAYPAL_*` - PayPal API credentials

**Bot:**
- `TELEGRAM_BOT_TOKEN` - Bot token from BotFather
- `BACKEND_API_URL` - Backend API base URL

**Frontend:**
- `VITE_API_URL` - Backend API base URL

### Docker
Each service has a Dockerfile. Use docker-compose.yml for local PostgreSQL:
```bash
docker-compose up -d  # Runs PostgreSQL on port 5433
```

### Production Deployment
- Backend/Bot: Railway/Render/Fly.io
- Frontend: Vercel/Netlify
- Database: Supabase/Neon/Railway

### CI/CD
Standard flow:
1. Run linting and tests
2. Build services
3. Deploy to staging
4. Deploy to production

## Common Development Workflows

### Adding a new API endpoint
1. Define Zod validator in `backend/src/validators/`
2. Add service method in appropriate service file
3. Add controller handler in `backend/src/controllers/`
4. Add route in `backend/src/routes/`
5. Update frontend API client in `frontend/src/services/`

### Adding a new database field
1. Update `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration)
3. Run `npm run db:generate` (regenerates Prisma client)
4. Update TypeScript types and services as needed

### Adding a new action type
1. Add to `ActionType` enum in Prisma schema
2. Create migration
3. Update action logging calls in relevant services
4. Update frontend action log display if needed

## Naming Conventions

- **Files:** kebab-case (`session-service.ts`, `admin-controller.ts`)
- **Classes:** PascalCase (`SessionService`, `AdminController`)
- **Functions/Variables:** camelCase (`getUserById`, `sessionId`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Database:** snake_case (`session_id`, `email_user`, `web_users`)

## Important Notes

- **Database Transactions:** Use Prisma transactions for multi-step operations to maintain data integrity
- **No Status Skipping:** Session status must follow the defined flow - never jump states
- **Both Emails Stored:** Always keep both `emailUser` and `emailPaypal` for audit trail
- **Action Logging:** Log all important events to `actions` table for compliance and debugging
- **API Response Consistency:** All API endpoints return `{ success, data?, error? }` format
- **PostgreSQL Port:** Docker PostgreSQL runs on port 5433 (not default 5432) to avoid conflicts
