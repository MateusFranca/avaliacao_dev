import { db } from '../database/connection';
import { products, groups } from '../database/schema';
import { eq, sql, like } from 'drizzle-orm';

export class ProductRepository {
  async findAll(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(products).limit(limit).offset(offset);
  }

  async findById(id: number) {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    groupId?: number;
  }) {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<{
    name: string;
    description: string;
    price: number;
    stock: number;
    groupId: number;
  }>) {
    const result = await db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number) {
    await db.delete(products).where(eq(products.id, id));
  }

  // CORRIGIDO #1: Usando query parametrizada segura (SQL Injection)
  async searchByName(searchTerm: string) {
    return await db
      .select()
      .from(products)
      .where(like(products.name, `%${searchTerm}%`));
  }

  async findByGroup(groupId: number) {
    return await db
      .select()
      .from(products)
      .where(eq(products.groupId, groupId));
  }
}

