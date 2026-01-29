/**
 * Publication Validators
 * Zod schemas for publication input validation
 */

import { z } from 'zod';

// Platform enum
const platformEnum = z.enum(['instagram', 'tiktok', 'facebook', 'youtube']);

// Create publication schema
export const createPublicationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long (max 200 characters)'),
  description: z.string().max(5000, 'Description too long (max 5000 characters)'),
  videoPath: z.string(),
  thumbnailPath: z.string().optional(),
  platforms: z
    .array(platformEnum)
    .min(1, 'Select at least one platform')
    .max(4, 'Maximum 4 platforms allowed'),
});

// Update publication schema
export const updatePublicationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  platforms: z.array(platformEnum).min(1).max(4).optional(),
});

// List publications schema (query params)
export const listPublicationsSchema = z.object({
  status: z
    .enum(['PENDING', 'PROCESSING', 'PUBLISHED', 'PARTIAL', 'FAILED', 'CANCELLED'])
    .optional(),
  platform: platformEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20)),
});

// Export inferred types
export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;
