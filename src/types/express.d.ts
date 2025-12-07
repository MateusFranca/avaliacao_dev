import { Request } from 'express';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}
