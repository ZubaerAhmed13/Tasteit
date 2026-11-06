import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const tasteitSync=sqliteTable('tasteit_sync',{
  accountId:text('account_id').primaryKey().notNull(),
  revision:integer('revision').notNull(),
  payload:text('payload'),
  updatedAt:text('updated_at').notNull()
});
