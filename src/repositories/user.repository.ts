import { db } from '../database/connection';
import { users, userGroups, groups } from '../database/schema';
import { eq, and } from 'drizzle-orm';

export class UserRepository {
  // CORRIGIDO #3: Removendo campo password das queries + #17: Paginação implementada
  async findAll(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .limit(limit)
      .offset(offset);
  }

  // CORRIGIDO #3: Removendo campo password das queries
  async findById(id: number) {
    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));
    return result[0];
  }

  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) {
    const result = await db
      .insert(users)
      .values({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as any,
      })
      .returning();
    return result[0];
  }

  // CORRIGIDO #3: Removendo campo password do retorno
  async update(id: number, data: Partial<{
    name: string;
    email: string;
    password: string;
    role: string;
    active: boolean;
  }>) {
    const result = await db
      .update(users)
      .set({
        ...data,
        role: data.role as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    return result[0];
  }

  async delete(id: number) {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUserGroups(userId: number) {
    return await db
      .select()
      .from(userGroups)
      .where(eq(userGroups.userId, userId));
  }

  async addUserToGroup(userId: number, groupId: number) {
    const result = await db
      .insert(userGroups)
      .values({ userId, groupId })
      .returning();
    return result[0];
  }

  async removeUserFromGroup(userId: number, groupId: number) {
    // CORRIGIDO #23: Constraint UNIQUE em (userId, groupId) previne duplicatas - delete é seguro
    await db
      .delete(userGroups)
      .where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
  }
}

