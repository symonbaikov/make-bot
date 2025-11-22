import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Special logging for webhook endpoints
  if (req.path.startsWith('/api/webhook')) {
    logger.info('🔔 Webhook request received', {
      method: req.method,
      path: req.path,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      body: req.body ? JSON.stringify(req.body) : 'empty',
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      isEmpty: !req.body || Object.keys(req.body).length === 0,
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
