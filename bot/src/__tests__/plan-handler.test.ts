import { handlePlanSelection, getPlanConfig } from '../handlers/plan-handler';
import { BotContext } from '../middleware/session-middleware';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Plan Handler', () => {
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
      session: {
        waitingForPlan: true,
      },
      answerCbQuery: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue({
        message_id: 2,
        chat: { id: 123456789 },
      }),
    };
  });

  it('should handle BASIC plan selection', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:BASIC';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.session?.plan).toBe('BASIC');
    expect(mockCtx.session?.amount).toBe(64);
    expect(mockCtx.session?.currency).toBe('GBP');
    expect(mockCtx.session?.waitingForPlan).toBe(false);
    expect(mockCtx.session?.waitingForEmail).toBe(true);
  });

  it('should handle STANDARD plan selection', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:STANDARD';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.session?.plan).toBe('STANDARD');
    expect(mockCtx.session?.amount).toBe(97);
    expect(mockCtx.session?.currency).toBe('GBP');
  });

  it('should handle PREMIUM plan selection', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:PREMIUM';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.session?.plan).toBe('PREMIUM');
    expect(mockCtx.session?.amount).toBe(147);
    expect(mockCtx.session?.currency).toBe('GBP');
  });

  it('should answer callback query with confirmation', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:STANDARD';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('Вибрано тариф: Стандарт')
    );
  });

  it('should request email after plan selection', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:BASIC';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledTimes(1);
    const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toContain('Тариф вибрано');
    expect(callArgs[0]).toContain('64 GBP');
    expect(callArgs[0]).toContain('електронної пошти');
  });

  it('should reject invalid plan type', async () => {
    (mockCtx.callbackQuery as any).data = 'plan:INVALID';
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('Невірний тариф')
    );
    expect(mockCtx.session?.plan).toBeUndefined();
  });

  it('should reject callback query without data', async () => {
    delete (mockCtx.callbackQuery as any).data;
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.answerCbQuery).toHaveBeenCalledWith(
      expect.stringContaining('Невірний вибір тарифу')
    );
  });

  it('should get correct plan configuration', () => {
    const basicConfig = getPlanConfig('BASIC');
    expect(basicConfig.name).toBe('Базовий');
    expect(basicConfig.amount).toBe(64);

    const standardConfig = getPlanConfig('STANDARD');
    expect(standardConfig.name).toBe('Стандарт');
    expect(standardConfig.amount).toBe(97);

    const premiumConfig = getPlanConfig('PREMIUM');
    expect(premiumConfig.name).toBe('Преміум');
    expect(premiumConfig.amount).toBe(147);
  });

  it('should not process if not waiting for plan', async () => {
    mockCtx.session!.waitingForPlan = false;
    
    await handlePlanSelection(mockCtx as BotContext);

    expect(mockCtx.answerCbQuery).not.toHaveBeenCalled();
    expect(mockCtx.reply).not.toHaveBeenCalled();
  });
});

