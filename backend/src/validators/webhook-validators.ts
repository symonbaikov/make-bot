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

const paypalIpnSchema = z
  .object({
    txn_id: z.string().min(1, 'Transaction ID is required'),
    payment_status: z.string().min(1, 'Payment status is required'),
    mc_gross: z.string().optional(),
    mc_gross_1: z.string().optional(),
    mc_currency: z.string().optional(),
    payer_email: z.string().email('Invalid email format').optional(),
    payment_date: z.string().optional(),
    custom: z.string().optional(),
    item_name: z.string().optional(),
    item_name1: z.string().optional(),
    transaction_subject: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    address_name: z.string().optional(),
    payer_id: z.string().optional(),
  })
  // Allow any additional fields from PayPal/IPN without failing validation
  .passthrough();

export const makePaypalWebhookSchema = z.union([paypalIpnSchema, z.array(paypalIpnSchema)]);

export type BotWebhookInput = z.infer<typeof botWebhookSchema>;
export type PayPalWebhookInput = z.infer<typeof paypalWebhookSchema>;
export type MakePaypalWebhookInput = z.infer<typeof makePaypalWebhookSchema>;
