import { BotContext } from '../middleware/session-middleware';

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `📖 Help\n\n` +
    `Available commands:\n` +
    `/start - Start the bot or continue with session ID\n` +
    `/help - Show this help message\n\n` +
    `How to use:\n` +
    `1. Use the link provided to you (includes session ID)\n` +
    `2. Or use /start <your_session_id>\n` +
    `3. Provide your email address when asked\n` +
    `4. Complete payment using the provided link\n\n` +
    `If you have any questions, please contact support.`
  );
}

