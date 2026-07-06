import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export function validateRequest(schema: ZodSchema, target: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(target === 'query' ? req.query : req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: result.error.flatten(),
        },
      });
    }
    if (target === 'query') {
      (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}
