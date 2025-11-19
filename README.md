# Make Bot

Telegram bot + Web interface for email collection and payment management.

## Project Structure

```
make-bot/
├── backend/          # Node.js API server
├── bot/              # Telegram bot
├── frontend/         # React/Next.js admin panel
└── docs/             # Documentation
```

## Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+
- npm 9+

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the values
4. Setup database:
   - **Option A (Docker - Recommended):** `npm run db:start` then `cd backend && npm run db:migrate && npm run db:seed`
   - **Option B (Local PostgreSQL):** `npm run db:setup-local` then `cd backend && npm run db:migrate && npm run db:seed`
   - See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for detailed instructions
5. Start development servers:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start all services in development mode
- `npm run build` - Build all services
- `npm run lint` - Lint all code
- `npm run format` - Format all code

## License

Private
