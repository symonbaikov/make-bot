import { Request, Response, NextFunction } from 'express';

type AsyncFunction<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
>(fn: AsyncFunction<P, ResBody, ReqBody, ReqQuery>) {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

