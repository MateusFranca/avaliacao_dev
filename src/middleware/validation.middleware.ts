import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      // CORRIGIDO #19: Retorna detalhes de validação do Zod
      if (error.errors) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      res.status(400).json({ error: 'Validation error' });
    }
  };
};

