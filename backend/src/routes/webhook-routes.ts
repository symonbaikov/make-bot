import { Router } from 'express';
import { webhookController } from '../controllers/webhook-controller';
import { validateBody } from '../utils/validation';
import { botWebhookSchema, paypalWebhookSchema, makePaypalWebhookSchema } from '../validators/webhook-validators';
import { webhookLimiter } from '../middleware/rate-limiter';
import { parseMakePaypalWebhook } from '../middleware/parse-make-paypal-webhook';

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

// POST /api/webhook/paypal/make - raw PayPal payload from Make scenario
router.post(
  '/paypal/make',
  parseMakePaypalWebhook,
  validateBody(makePaypalWebhookSchema),
  webhookController.makePaypalWebhook
);

export default router;
