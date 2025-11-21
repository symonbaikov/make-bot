import { SessionData } from '../types';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_MODE = (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live';

/**
 * Generate PayPal payment link with session_id in custom parameter
 */
export function generatePayPalLink(sessionData: SessionData): string {
  const baseUrl =
    PAYPAL_MODE === 'sandbox'
      ? 'https://www.sandbox.paypal.com/checkoutnow'
      : 'https://www.paypal.com/checkoutnow';

  const params = new URLSearchParams({
    client_id: PAYPAL_CLIENT_ID,
    token: 'EC-Token', // This should be replaced with actual PayPal token
    custom: sessionData.sessionId, // Session ID in custom parameter
  });

  // For now, return a placeholder link
  // In production, this should use PayPal SDK to create actual payment
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate PayPal payment button URL
 * Note: In production, use PayPal SDK to create proper payment links
 * For now, return instructions with session ID
 */
export function getPayPalPaymentUrl(sessionData: SessionData): string {
  const amount = sessionData.amount;
  const currency = sessionData.currency || 'USD';
  const sessionId = sessionData.sessionId;
  const plan = sessionData.plan;

  // In production, this should integrate with PayPal SDK
  // For now, return instructions
  return (
    `💰 Payment Details:\n` +
    `Plan: ${plan}\n` +
    `Amount: ${amount} ${currency}\n` +
    `Session ID: ${sessionId}\n\n` +
    `🔗 Будь ласка, завершіть оплату, використовуючи посилання, надане системою.\n` +
    `Make sure to include your session ID (${sessionId}) in the payment custom field.\n\n` +
    `After payment, you will receive access to your plan.`
  );
}

