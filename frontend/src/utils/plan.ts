import { Plan } from '../types';

/**
 * Get Ukrainian name for plan
 */
export function getPlanName(plan: Plan): string {
  const planNames: Record<Plan, string> = {
    BASIC: 'Базовий',
    STANDARD: 'Стандарт',
    PREMIUM: 'Преміум',
  };
  return planNames[plan] || plan;
}

/**
 * Get plan icon emoji
 */
export function getPlanIcon(plan: Plan): string {
  const planIcons: Record<Plan, string> = {
    BASIC: '📦',
    STANDARD: '⭐',
    PREMIUM: '💎',
  };
  return planIcons[plan] || '📋';
}

/**
 * Get plan display text with icon
 */
export function getPlanDisplay(plan: Plan): string {
  return `${getPlanIcon(plan)} ${getPlanName(plan)}`;
}
