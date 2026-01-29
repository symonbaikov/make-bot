import { handleStart } from '../handlers/start-handler';
import { BotContext } from '../middleware/session-middleware';
import { getPlanKeyboard } from '../handlers/plan-handler';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Start Handler', () => {
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    mockCtx = {
      from: {
        id: 123456789,
        username: 'testuser',
        is_bot: false,
        first_name: 'Test',
      },
      chat: {
        id: 123456789,
        type: 'private',
        first_name: 'Test',
      },
      message: {
        message_id: 1,
        date: Date.now(),
        text: '/start',
        chat: {
          id: 123456789,
          type: 'private',
          first_name: 'Test',
        },
        from: {
          id: 123456789,
          username: 'testuser',
          is_bot: false,
          first_name: 'Test',
        },
      },
      session: {},
      reply: jest.fn().mockResolvedValue({
        message_id: 2,
        chat: { id: 123456789 },
      }),
    };
  });

  it('should initialize session and set waitingForPlan flag', async () => {
    await handleStart(mockCtx as BotContext);

    expect(mockCtx.session?.waitingForPlan).toBe(true);
    expect(mockCtx.session?.waitingForEmail).toBeUndefined();
  });

  it('should send welcome message with plan keyboard', async () => {
    await handleStart(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledTimes(1);
    const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0];
    
    expect(callArgs[0]).toContain('Вітаю');
    expect(callArgs[0]).toContain('Базовий');
    expect(callArgs[0]).toContain('Стандарт');
    expect(callArgs[0]).toContain('Преміум');
    
    expect(callArgs[1]).toHaveProperty('reply_markup');
    expect(callArgs[1].reply_markup).toHaveProperty('inline_keyboard');
  });

  it('should include all three plan buttons in keyboard', () => {
    const keyboard = getPlanKeyboard();
    
    expect(keyboard.inline_keyboard).toHaveLength(3);
    expect(keyboard.inline_keyboard[0][0].text).toBe('📦 Базовий');
    expect(keyboard.inline_keyboard[0][0].callback_data).toBe('plan:BASIC');
    expect(keyboard.inline_keyboard[1][0].text).toBe('⭐ Стандарт');
    expect(keyboard.inline_keyboard[1][0].callback_data).toBe('plan:STANDARD');
    expect(keyboard.inline_keyboard[2][0].text).toBe('💎 Преміум');
    expect(keyboard.inline_keyboard[2][0].callback_data).toBe('plan:PREMIUM');
  });

  it('should handle missing session gracefully', async () => {
    const ctxWithoutSession = {
      ...mockCtx,
      session: undefined,
    } as BotContext;
    
    await handleStart(ctxWithoutSession);

    expect(ctxWithoutSession.session).toBeDefined();
    expect((ctxWithoutSession.session as any)?.waitingForPlan).toBe(true);
  });

  it('should handle reply errors gracefully', async () => {
    const error = new Error('Telegram API error');
    // First call fails (main message), then two error messages succeed
    (mockCtx.reply as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        message_id: 3,
        chat: { id: 123456789 },
      })
      .mockResolvedValueOnce({
        message_id: 4,
        chat: { id: 123456789 },
      });

    await handleStart(mockCtx as BotContext);

    // Should try to send error messages (one from inner catch, one from outer catch)
    expect(mockCtx.reply).toHaveBeenCalledTimes(3);
    const errorCall1 = (mockCtx.reply as jest.Mock).mock.calls[1];
    expect(errorCall1[0]).toContain('помилка');
    const errorCall2 = (mockCtx.reply as jest.Mock).mock.calls[2];
    expect(errorCall2[0]).toContain('помилка');
  });

  it('should not use Markdown parse mode', async () => {
    await handleStart(mockCtx as BotContext);

    const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0];
    expect(callArgs[1]).not.toHaveProperty('parse_mode');
  });

  it('should include correct plan prices in message', async () => {
    await handleStart(mockCtx as BotContext);

    const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0];
    const message = callArgs[0];
    
    expect(message).toContain('64 GBP');
    expect(message).toContain('97 GBP');
    expect(message).toContain('147 GBP');
  });
});

