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
4. Setup database (see backend/README.md)
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
