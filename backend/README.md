# Backend API

Backend API server for Make Bot.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

3. Setup database:
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Run migrations
   npm run db:migrate

   # Seed database (optional)
   npm run db:seed
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Lint code
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run migrations
- `npm run db:migrate:deploy` - Deploy migrations (production)
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database

## Database Schema

See `prisma/schema.prisma` for the database schema.

## API Endpoints

- `GET /health` - Health check
- `POST /api/webhook/bot` - Webhook from Telegram bot
- `POST /api/webhook/paypal` - Webhook from PayPal
- `POST /api/webhook/paypal/make` - Webhook from Make (PayPal IPN forwarded; accepts JSON or form-encoded body)
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/payments` - List payments/sessions
- `GET /api/admin/payments/:id` - Get payment details
- `POST /api/admin/payments/:id/resend` - Resend email
- `PUT /api/admin/payments/:id/email` - Update email
- `GET /api/admin/stats` - Statistics
- `GET /api/admin/actions` - Activity log
- `POST /api/admin/sessions` - Create session manually
- `GET /api/admin/export` - Export data
