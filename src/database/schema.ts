import { pgTable, serial, varchar, text, timestamp, integer, boolean, pgEnum, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'viewer']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CORRIGIDO #22: Adicionados índices em Foreign Keys + constraint única
export const userGroups = pgTable('user_groups', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  groupId: integer('group_id').references(() => groups.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_groups_user_id_idx').on(table.userId),
  groupIdIdx: index('user_groups_group_id_idx').on(table.groupId),
}));

// CORRIGIDO #22: Adicionado índice em Foreign Key
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  stock: integer('stock').default(0).notNull(),
  groupId: integer('group_id').references(() => groups.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  groupIdIdx: index('products_group_id_idx').on(table.groupId),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userGroups: many(userGroups),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  userGroups: many(userGroups),
  products: many(products),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  group: one(groups, {
    fields: [products.groupId],
    references: [groups.id],
  }),
}));

