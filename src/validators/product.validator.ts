import { z } from 'zod';

// CORRIGIDO #5: Preço positivo | #6: Estoque não negativo | #7: Tamanho máximo de strings
export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive'),
  stock: z.number().nonnegative('Stock cannot be negative'),
  groupId: z.number().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive').optional(),
  stock: z.number().nonnegative('Stock cannot be negative').optional(),
  groupId: z.number().optional(),
});

