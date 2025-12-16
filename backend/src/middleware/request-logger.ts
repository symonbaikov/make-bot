import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Special logging for webhook endpoints
  if (req.path.startsWith('/api/webhook')) {
    const body = req.body as unknown;
    const bodyType = typeof body;
    const isObjectBody = body !== null && bodyType === 'object' && !Buffer.isBuffer(body);

    const bodyForLog = (() => {
      if (body == null) return 'empty';
      if (typeof body === 'string') return body.length > 2000 ? body.slice(0, 2000) : body;
      try {
        const json = JSON.stringify(body);
        return json.length > 2000 ? `${json.slice(0, 2000)}…` : json;
      } catch {
        return '[unserializable]';
      }
    })();

    logger.info('🔔 Webhook request received', {
      method: req.method,
      path: req.path,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      body: bodyForLog,
      bodyType,
      bodyKeys: isObjectBody ? Object.keys(body as any) : [],
      isEmpty:
        body == null
          ? true
          : typeof body === 'string'
            ? body.trim().length === 0
            : isObjectBody
              ? Object.keys(body as any).length === 0
              : false,
      rawBody: (req as any).rawBody ? String((req as any).rawBody?.substring(0, 500)) : undefined,
    });
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
}
