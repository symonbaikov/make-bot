import { z } from 'zod';
import { Plan, SessionStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const loginWithResetCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
});

export const createSessionSchema = z.object({
  plan: z.nativeEnum(Plan, {
    errorMap: () => ({ message: 'Invalid plan' }),
  }),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
});

export const updateEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const sendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  body: z.string().min(1, 'Body is required').max(10000, 'Body is too long'),
});

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(SessionStatus).optional(),
  plan: z.nativeEnum(Plan).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const listActionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  type: z.string().optional(),
  ref: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const exportSchema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  plan: z.nativeEnum(Plan).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  format: z.enum(['csv', 'excel', 'pdf', 'docx']).default('csv'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type LoginWithResetCodeInput = z.infer<typeof loginWithResetCodeSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type ListSessionsInput = z.infer<typeof listSessionsSchema>;
export type ListActionsInput = z.infer<typeof listActionsSchema>;
export type ExportInput = z.infer<typeof exportSchema>;

