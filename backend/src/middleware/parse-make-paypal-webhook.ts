import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

function escapeRawControlCharsInJsonStrings(input: string): string {
  let inString = false;
  let escapeNext = false;
  let out = '';

  const escapeControl = (ch: string): string => {
    switch (ch) {
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      default: {
        const code = ch.charCodeAt(0);
        return `\\u${code.toString(16).padStart(4, '0')}`;
      }
    }
  };

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
      if (ch.charCodeAt(0) < 0x20) {
        out = out.slice(0, -1);
        out += escapeControl(ch);
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

    // JSON strings cannot contain raw ASCII control characters.
    if (ch.charCodeAt(0) < 0x20) {
      out += escapeControl(ch);
      continue;
    }

    out += ch;
  }

  return out;
}

function stripTrailingCommas(input: string): string {
  let inString = false;
  let escapeNext = false;
  let out = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
        out += ch;
        continue;
      }

      if (ch === ',') {
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j++;
        const next = input[j];
        if (next === '}' || next === ']') {
          continue;
        }
      }

      out += ch;
      continue;
    }

    if (escapeNext) {
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

    out += ch;
  }

  return out;
}

function extractFirstJsonValue(input: string): string | null {
  let inString = false;
  let escapeNext = false;
  let start = -1;
  const stack: Array<'{' | '['> = [];

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === '\\') {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (start === -1) {
      if (ch === '{' || ch === '[') {
        start = i;
        stack.push(ch);
      }
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const open = stack.pop();
      if (!open) return null;
      if ((open === '{' && ch !== '}') || (open === '[' && ch !== ']')) return null;
      if (stack.length === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseLooseJsonObject(input: string): Record<string, string> | null {
  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  const slice = input.slice(start + 1, end);
  const result: Record<string, string> = {};

  let i = 0;
  const len = slice.length;

  const skipWhitespaceAndCommas = (): void => {
    while (i < len) {
      const ch = slice[i];
      if (ch === ',' || /\s/.test(ch)) {
        i++;
        continue;
      }
      break;
    }
  };

  const readJsonString = (): string | null => {
    if (slice[i] !== '"') return null;
    i++; // skip opening quote
    let out = '';
    let escapeNext = false;
    while (i < len) {
      const ch = slice[i++];
      if (escapeNext) {
        out += ch;
        escapeNext = false;
        continue;
      }
      if (ch === '\\') {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        return out;
      }
      out += ch;
    }
    return out; // unterminated string; best-effort
  };

  const readUntilCommaOrEnd = (): string => {
    let out = '';
    while (i < len) {
      const ch = slice[i];
      if (ch === ',') break;
      out += ch;
      i++;
    }
    return out.trim();
  };

  while (i < len) {
    skipWhitespaceAndCommas();
    if (i >= len) break;
    if (slice[i] !== '"') {
      i++;
      continue;
    }

    const key = readJsonString();
    if (!key) break;

    // Skip whitespace then colon
    while (i < len && /\s/.test(slice[i])) i++;
    if (slice[i] !== ':') continue;
    i++; // skip colon
    while (i < len && /\s/.test(slice[i])) i++;

    let value: string | null = null;
    if (slice[i] === '"') {
      const raw = readJsonString();
      value = raw == null ? null : raw;
    } else {
      value = readUntilCommaOrEnd();
    }

    if (value != null) {
      result[key] = value;
    }

    // Move past comma if present
    if (slice[i] === ',') i++;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function tryParseJsonWithRepairs(
  raw: string,
  maxDepth = 2
): { parsed: unknown | null; error?: string } {
  const queue: Array<{ value: string; depth: number }> = [{ value: raw, depth: 0 }];
  const seen = new Set<string>();
  let firstError: string | undefined;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const { value, depth } = current;
    if (seen.has(value)) continue;
    seen.add(value);

    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === 'string' && depth < maxDepth) {
        const nested = parsed.replace(/^\uFEFF/, '').trim();
        if (nested) {
          queue.push({ value: nested, depth: depth + 1 });
        }
        continue;
      }
      return { parsed };
    } catch (error) {
      if (!firstError) {
        firstError = error instanceof Error ? error.message : String(error);
      }
      // continue with repair candidates
    }

    const repaired = stripTrailingCommas(escapeRawControlCharsInJsonStrings(value));
    if (repaired !== value) {
      try {
        const parsed = JSON.parse(repaired) as unknown;
        if (typeof parsed === 'string' && depth < maxDepth) {
          const nested = parsed.replace(/^\uFEFF/, '').trim();
          if (nested) {
            queue.push({ value: nested, depth: depth + 1 });
          }
          continue;
        }
        return { parsed };
      } catch (error) {
        if (!firstError) {
          firstError = error instanceof Error ? error.message : String(error);
        }
        // continue
      }
    }

    if (depth < maxDepth) {
      const extracted = extractFirstJsonValue(value);
      if (extracted && extracted !== value) {
        queue.push({ value: extracted, depth: depth + 1 });
      }
    }
  }

  return { parsed: null, error: firstError };
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

  // Try JSON first (valid JSON object/array) and apply safe repairs for common sender issues.
  const looksLikeJson =
    trimmed.startsWith('{') ||
    trimmed.startsWith('[') ||
    trimmed.startsWith('"') ||
    trimmed.includes('{') ||
    trimmed.includes('[');
  if (looksLikeJson) {
    const { parsed, error } = tryParseJsonWithRepairs(trimmed);
    if (parsed != null && (typeof parsed === 'object' || Array.isArray(parsed))) {
      req.body = normalizeToPaypalIpnShape(parsed);
      next();
      return;
    }

    const looseCandidate =
      trimmed.includes('"transaction_id"') ||
      trimmed.includes('"transactionId"') ||
      trimmed.includes('"txn_id"') ||
      trimmed.includes('"order_id"') ||
      trimmed.includes('"payment_system"') ||
      trimmed.includes('"payment_status"') ||
      trimmed.includes('"payer_email"') ||
      trimmed.includes('"email"');
    if (looseCandidate) {
      const loose = parseLooseJsonObject(trimmed);
      if (loose) {
        logger.warn('Loosely parsed Make PayPal webhook body as JSON object (non-strict sender)', {
          contentType: req.get('content-type'),
          sample: trimmed.slice(0, 250),
        });
        req.body = normalizeToPaypalIpnShape(loose);
        next();
        return;
      }
    }

    logger.warn('Failed to JSON.parse Make PayPal webhook body, will try form parsing', {
      error,
      contentType: req.get('content-type'),
      sample: trimmed.slice(0, 250),
    });
  }

  // Fallback: treat as application/x-www-form-urlencoded (PayPal IPN-style).
  // Only attempt if it looks like a querystring; otherwise we'd mis-parse arbitrary text/JSON.
  if (!trimmed.includes('=')) {
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
