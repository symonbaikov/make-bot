/**
 * Integration test to verify all handlers are properly registered
 * This test ensures that handlers don't break when code changes
 */

describe('Bot Handlers Registration', () => {
  it('should export handleStart function', () => {
    const { handleStart } = require('../handlers/start-handler');
    expect(typeof handleStart).toBe('function');
  });

  it('should export handlePlanSelection function', () => {
    const { handlePlanSelection } = require('../handlers/plan-handler');
    expect(typeof handlePlanSelection).toBe('function');
  });

  it('should export handleEmailInput function', () => {
    const { handleEmailInput } = require('../handlers/email-handler');
    expect(typeof handleEmailInput).toBe('function');
  });

  it('should export getPlanKeyboard function', () => {
    const { getPlanKeyboard } = require('../handlers/plan-handler');
    expect(typeof getPlanKeyboard).toBe('function');

    const keyboard = getPlanKeyboard();
    expect(keyboard).toHaveProperty('inline_keyboard');
    expect(Array.isArray(keyboard.inline_keyboard)).toBe(true);
    expect(keyboard.inline_keyboard.length).toBe(3);
  });

  it('should have all plan buttons with correct callback_data', () => {
    const { getPlanKeyboard } = require('../handlers/plan-handler');
    const keyboard = getPlanKeyboard();

    const callbackDataList = keyboard.inline_keyboard.map((row: any[]) => row[0].callback_data);
    expect(callbackDataList).toContain('plan:BASIC');
    expect(callbackDataList).toContain('plan:STANDARD');
    expect(callbackDataList).toContain('plan:PREMIUM');
  });

  it('should have Ukrainian plan names in buttons', () => {
    const { getPlanKeyboard } = require('../handlers/plan-handler');
    const keyboard = getPlanKeyboard();

    const buttonTexts = keyboard.inline_keyboard.map((row: any[]) => row[0].text);
    expect(buttonTexts).toContain('📦 Базовий');
    expect(buttonTexts).toContain('⭐ Стандарт');
    expect(buttonTexts).toContain('💎 Преміум');
  });
});
