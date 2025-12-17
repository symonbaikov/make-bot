import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

function escapeRawNewlinesInJsonStrings(input: string): string {
  let inString = false;
  let escapeNext = false;
  let out = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
      continue;
    }

    // inString === true
    if (escapeNext) {
      if (ch === '\n') {
        out = out.slice(0, -1);
        out += '\\n';
        escapeNext = false;
        continue;
      }
      if (ch === '\r') {
        out = out.slice(0, -1);
        out += '\\r';
        escapeNext = false;
        continue;
      }
      out += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }

    // JSON strings cannot contain raw CR/LF
    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      out += '\\r';
      continue;
    }

    out += ch;
  }

  return out;
}

function parseUrlEncodedToObject(input: string): Record<string, string> {
  const normalized = input.startsWith('?') ? input.slice(1) : input;
  const params = new URLSearchParams(normalized);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function normalizeToPaypalIpnShape(payload: unknown): unknown {
  const normalizeOne = (item: any): any => {
    if (!item || typeof item !== 'object' || Buffer.isBuffer(item)) return item;

    // Already PayPal IPN-like
    if (typeof item.txn_id === 'string' && typeof item.payment_status === 'string') {
      return item;
    }

    // Tilda/other sources sometimes use different field names
    const transactionId = item.transaction_id ?? item.transactionId;
    if (!transactionId) return item;

    const paymentStatus = (item.payment_status ?? item.status ?? 'Completed') as unknown;
    const payerEmail = (item.payer_email ?? item.email ?? item.emailPaypal) as unknown;
    const amount = (item.mc_gross ?? item.payment_gross ?? item.amount ?? item.sum) as unknown;
    const currency = (item.mc_currency ?? item.currency ?? 'USD') as unknown;
    const custom = (item.custom ?? item.sessionId ?? item.order_id ?? item.orderId ?? item.formid) as
      | unknown
      | undefined;
    const itemName = (item.item_name ?? item.product_name ?? item.productName) as unknown;

    return {
      ...item,
      txn_id: String(transactionId),
      payment_status: String(paymentStatus),
      payer_email: typeof payerEmail === 'string' ? payerEmail : undefined,
      mc_gross: amount != null ? String(amount) : undefined,
      mc_currency: currency != null ? String(currency) : undefined,
      custom: custom != null ? String(custom) : item.custom,
      item_name: itemName != null ? String(itemName) : item.item_name,
    };
  };

  if (Array.isArray(payload)) return payload.map(normalizeOne);
  return normalizeOne(payload);
}

export function parseMakePaypalWebhook(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as unknown;

  if (body == null) {
    next();
    return;
  }

  if (typeof body === 'object' && !Buffer.isBuffer(body)) {
    req.body = normalizeToPaypalIpnShape(body);
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
      req.body = normalizeToPaypalIpnShape(JSON.parse(trimmed) as unknown);
      next();
      return;
    } catch (error) {
      logger.warn('Failed to JSON.parse Make PayPal webhook body, will try form parsing', {
        error: error instanceof Error ? error.message : String(error),
        contentType: req.get('content-type'),
        sample: trimmed.slice(0, 250),
      });

      // Some senders embed raw newlines inside string values; try a safe repair pass.
      try {
        const repaired = escapeRawNewlinesInJsonStrings(trimmed);
        req.body = normalizeToPaypalIpnShape(JSON.parse(repaired) as unknown);
        next();
        return;
      } catch {
        // continue to form parsing / error below
      }
    }
  }

  // Fallback: treat as application/x-www-form-urlencoded (PayPal IPN-style).
  // Only attempt if it looks like a querystring; otherwise we'd mis-parse arbitrary text/JSON.
  if (!trimmed.includes('=') && !trimmed.includes('&')) {
    sendError(
      res,
      'Invalid request body. Expected JSON (object/array) or a form-encoded PayPal IPN string.',
      'INVALID_BODY',
      400
    );
    return;
  }

  try {
    const parsed = parseUrlEncodedToObject(trimmed);
    if (Object.keys(parsed).length > 0) {
      req.body = normalizeToPaypalIpnShape(parsed);
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
