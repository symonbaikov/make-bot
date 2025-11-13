import { Router } from 'express';
import { webhookController } from '../controllers/webhook-controller';
import { validateBody } from '../utils/validation';
import { botWebhookSchema, paypalWebhookSchema } from '../validators/webhook-validators';
import { webhookLimiter } from '../middleware/rate-limiter';

const router = Router();

// Apply rate limiting to webhook endpoints
router.use(webhookLimiter);

// POST /api/webhook/bot
router.post(
  '/bot',
  validateBody(botWebhookSchema),
  webhookController.botWebhook
);

// POST /api/webhook/paypal
router.post(
  '/paypal',
  validateBody(paypalWebhookSchema),
  webhookController.paypalWebhook
);

export default router;

