import { z } from 'zod';
import { Plan } from '@prisma/client';

export const botWebhookSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  email: z.string().email('Invalid email format'),
  tgUserId: z.string().min(1, 'Telegram user ID is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  plan: z.nativeEnum(Plan, {
    errorMap: () => ({ message: 'Invalid plan' }),
  }),
  amount: z.number().positive('Amount must be positive'),
});

export const paypalWebhookSchema = z.object({
  txnId: z.string().min(1, 'Transaction ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  emailPaypal: z.string().email('Invalid email format').optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  paymentDate: z.string().datetime().or(z.date()),
  status: z.enum(['completed', 'pending', 'refunded', 'failed']),
  custom: z.string().optional(), // PayPal custom parameter
});

export type BotWebhookInput = z.infer<typeof botWebhookSchema>;
export type PayPalWebhookInput = z.infer<typeof paypalWebhookSchema>;
