import { BotContext } from '../middleware/session-middleware';
import { handleStart } from '../handlers/start-handler';
import { handlePlanSelection } from '../handlers/plan-handler';
import { handleEmailInput } from '../handlers/email-handler';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock API client
jest.mock('../utils/api-client', () => ({
  apiClient: {
    sendBotWebhook: jest.fn().mockResolvedValue({
      sessionId: 'test-session-id',
      status: 'success',
    }),
    healthCheck: jest.fn().mockResolvedValue(true),
  },
}));

describe('Bot Integration Flow', () => {
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
      session: {},
      reply: jest.fn().mockResolvedValue({
        message_id: 1,
        chat: { id: 123456789 },
      }),
      answerCbQuery: jest.fn().mockResolvedValue(true),
    };
  });

  it('should complete full flow: start -> plan selection -> email', async () => {
    // Step 1: User sends /start
    const ctx1: BotContext = {
      ...mockCtx,
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
    } as BotContext;

    await handleStart(ctx1);

    expect(ctx1.session?.waitingForPlan).toBe(true);
    expect(ctx1.reply).toHaveBeenCalledTimes(1);
    const startCall = (ctx1.reply as jest.Mock).mock.calls[0];
    expect(startCall[0]).toContain('Вітаю');
    expect(startCall[1].reply_markup).toHaveProperty('inline_keyboard');

    // Step 2: User selects plan
    const ctx2: BotContext = {
      ...ctx1,
      callbackQuery: {
        id: 'callback-123',
        from: {
          id: 123456789,
          username: 'testuser',
          is_bot: false,
          first_name: 'Test',
        },
        message: {
          message_id: 1,
          date: Date.now(),
          text: 'Test message',
          chat: {
            id: 123456789,
            type: 'private',
            first_name: 'Test',
          },
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
        } as any,
        data: 'plan:STANDARD',
        chat_instance: 'chat-instance-123',
      },
    } as BotContext;

    await handlePlanSelection(ctx2);

    expect(ctx2.session?.plan).toBe('STANDARD');
    expect(ctx2.session?.amount).toBe(97);
    expect(ctx2.session?.waitingForPlan).toBe(false);
    expect(ctx2.session?.waitingForEmail).toBe(true);
    expect(ctx2.answerCbQuery).toHaveBeenCalled();
    expect(ctx2.reply).toHaveBeenCalledTimes(2);
    const planCall = (ctx2.reply as jest.Mock).mock.calls[1];
    expect(planCall[0]).toContain('Тариф вибрано');
    expect(planCall[0]).toContain('електронної пошти');

    // Step 3: User sends email
    const ctx3: BotContext = {
      ...ctx2,
      message: {
        message_id: 2,
        date: Date.now(),
        text: 'test@example.com',
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
    } as BotContext;

    await handleEmailInput(ctx3);

    expect(ctx3.session?.email).toBe('test@example.com');
    expect(ctx3.session?.waitingForEmail).toBe(false);
  });

  it('should handle plan selection without waitingForPlan flag', async () => {
    const ctx: BotContext = {
      ...mockCtx,
      session: {
        ...mockCtx.session!,
        waitingForPlan: false,
      },
      callbackQuery: {
        id: 'callback-123',
        from: {
          id: 123456789,
          username: 'testuser',
          is_bot: false,
          first_name: 'Test',
        },
        message: {
          message_id: 1,
          date: Date.now(),
          text: 'Test message',
          chat: {
            id: 123456789,
            type: 'private',
            first_name: 'Test',
          },
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Test',
          },
        } as any,
        data: 'plan:BASIC',
        chat_instance: 'chat-instance-123',
      },
    } as BotContext;

    await handlePlanSelection(ctx);

    // Should not process if not waiting for plan
    expect(ctx.session?.plan).toBeUndefined();
    expect(ctx.reply).not.toHaveBeenCalled();
  });
});

