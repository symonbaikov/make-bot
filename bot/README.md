# Telegram Bot

Telegram bot for email collection and payment processing.

## Features

- `/start` command with session_id support
- Email collection and validation
- Integration with Backend API
- Payment link generation
- Error handling and user-friendly messages

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:

   ```bash
   cp .env.example .env
   ```

3. Set required environment variables:

   ```env
   TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
   API_URL="http://localhost:3000"
   TELEGRAM_BOT_USERNAME="your_bot_username"
   PAYPAL_CLIENT_ID="your-paypal-client-id"
   PAYPAL_MODE="sandbox"
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

## Bot Commands

### /start

Start the bot or continue with session ID.

Usage:

- `/start` - Show welcome message
- `/start <session_id>` - Start with specific session ID

### /help

Show help message with available commands.

## User Flow

1. User clicks link with session_id: `https://t.me/your_bot?start=<session_id>`
2. Bot receives `/start <session_id>` command
3. Bot validates session_id with Backend API
4. Bot requests email address
5. User provides email
6. Bot validates email format
7. Bot sends data to Backend API (`POST /api/webhook/bot`)
8. Bot provides payment link
9. User completes payment via PayPal
10. Backend processes payment webhook
11. User receives access

## Architecture

```
bot/src/
├── handlers/          # Command and message handlers
│   ├── start-handler.ts
│   ├── email-handler.ts
│   ├── help-handler.ts
│   └── error-handler.ts
├── middleware/         # Bot middleware
│   └── session-middleware.ts
├── utils/             # Utilities
│   ├── api-client.ts
│   ├── email-validator.ts
│   ├── paypal.ts
│   └── logger.ts
├── types/             # TypeScript types
│   └── index.ts
└── index.ts           # Main bot file
```

## Integration with Backend API

The bot communicates with Backend API via HTTP:

- `GET /api/admin/payments/:id` - Get session information
- `POST /api/webhook/bot` - Send email collection data

## Error Handling

- Invalid session_id: User-friendly error message
- Invalid email: Validation error with example
- Backend API unavailable: Graceful error handling
- Network errors: Retry suggestions

## State Management

Bot uses in-memory session storage for conversation state:

- `sessionId` - Current session ID
- `plan` - Selected plan
- `amount` - Payment amount
- `waitingForEmail` - Whether bot is waiting for email input
- `email` - Collected email address

## Environment Variables

- `TELEGRAM_BOT_TOKEN` - Telegram bot token from BotFather
- `API_URL` - Backend API URL (default: http://localhost:3000)
- `TELEGRAM_BOT_USERNAME` - Bot username for deep links
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_MODE` - PayPal mode (sandbox/live)

## Production Deployment

1. Set all environment variables
2. Build the bot: `npm run build`
3. Start the bot: `npm start`
4. Use process manager (PM2, systemd) for production
5. Set up webhook mode instead of polling (optional)

## Troubleshooting

### Bot not responding

- Check TELEGRAM_BOT_TOKEN is set correctly
- Verify bot is running: check logs
- Test with `/start` command

### Backend API errors

- Verify API_URL is correct
- Check Backend API is running
- Check network connectivity

### Email validation fails

- Check email format (must be valid email)
- Check validator.js is working correctly
