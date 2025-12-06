import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ConflictError, ValidationError, BadRequestError } from '../errors/custom-errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // CORRIGIDO #18: Mensagens genéricas em produção + códigos HTTP apropriados
  console.error(err);
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Determinar status code baseado no tipo de erro
  let statusCode = 500;
  let errorMessage = isDevelopment ? err.message : 'Internal server error';

  if (err instanceof NotFoundError) {
    statusCode = 404;
    errorMessage = err.message;
  } else if (err instanceof ConflictError) {
    statusCode = 409;
    errorMessage = err.message;
  } else if (err instanceof ValidationError || err instanceof BadRequestError) {
    statusCode = 400;
    errorMessage = err.message;
  }

  res.status(statusCode).json({
    error: errorMessage,
    ...(isDevelopment && { stack: err.stack }),
  });
};

