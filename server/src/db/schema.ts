
import { text, pgTable, timestamp, integer, varchar } from 'drizzle-orm/pg-core';

export const filesTable = pgTable('files', {
  id: varchar('id', { length: 36 }).primaryKey(), // UUID
  filename: text('filename').notNull(),
  original_filename: text('original_filename').notNull(),
  mimetype: varchar('mimetype', { length: 255 }).notNull(),
  size: integer('size').notNull(),
  file_path: text('file_path').notNull(),
  unique_url: varchar('unique_url', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type File = typeof filesTable.$inferSelect;
export type NewFile = typeof filesTable.$inferInsert;

// Export all tables for proper query building
export const tables = { files: filesTable };
