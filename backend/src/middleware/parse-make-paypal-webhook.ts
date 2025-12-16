import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

function parseUrlEncodedToObject(input: string): Record<string, string> {
  const normalized = input.startsWith('?') ? input.slice(1) : input;
  const params = new URLSearchParams(normalized);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

export function parseMakePaypalWebhook(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as unknown;

  if (body == null) {
    next();
    return;
  }

  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    next();
    return;
  }

  const raw = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  (req as any).rawBody = raw;

  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    req.body = {};
    next();
    return;
  }

  // Try JSON first (valid JSON object/array).
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      req.body = JSON.parse(trimmed) as unknown;
      next();
      return;
    } catch (error) {
      logger.warn('Failed to JSON.parse Make PayPal webhook body, will try form parsing', {
        error: error instanceof Error ? error.message : String(error),
        contentType: req.get('content-type'),
        sample: trimmed.slice(0, 250),
      });
    }
  }

  // Fallback: treat as application/x-www-form-urlencoded (PayPal IPN-style).
  try {
    const parsed = parseUrlEncodedToObject(trimmed);
    if (Object.keys(parsed).length > 0) {
      req.body = parsed;
      next();
      return;
    }
  } catch (error) {
    logger.warn('Failed to parse Make PayPal webhook body as form-urlencoded', {
      error: error instanceof Error ? error.message : String(error),
      contentType: req.get('content-type'),
      sample: trimmed.slice(0, 250),
    });
  }

  sendError(
    res,
    'Invalid request body. Expected JSON (object/array) or a form-encoded PayPal IPN string.',
    'INVALID_BODY',
    400
  );
}

