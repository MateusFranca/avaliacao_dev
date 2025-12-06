import { db } from '../database/connection';
import { groups, userGroups, users } from '../database/schema';
import { eq } from 'drizzle-orm';

export class GroupRepository {
  // CORRIGIDO #17: Paginação implementada
  async findAll(page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return await db.select().from(groups).limit(limit).offset(offset);
  }

  async findById(id: number) {
    const result = await db.select().from(groups).where(eq(groups.id, id));
    return result[0];
  }

  async findByName(name: string) {
    const result = await db.select().from(groups).where(eq(groups.name, name));
    return result[0];
  }

  async create(data: { name: string; description?: string }) {
    const result = await db.insert(groups).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<{ name: string; description: string }>) {
    const result = await db
      .update(groups)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number) {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async getGroupUsers(groupId: number) {
    // CORRIGIDO #16: Usando JOIN para evitar N+1 query problem + #3: Removendo password
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(userGroups, eq(users.id, userGroups.userId))
      .where(eq(userGroups.groupId, groupId));
  }
}

