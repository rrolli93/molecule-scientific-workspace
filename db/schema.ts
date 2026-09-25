import {
  integer,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
// Bounded owner-private pilot: compare-and-swap commits decisions and events atomically.
export const memoryWorkspaces = sqliteTable("memory_workspaces", {
  owner: text("owner").primaryKey(),
  revision: integer("revision").notNull().default(0),
  document: text("document").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const researchNotebooks = sqliteTable(
  "research_notebooks",
  {
    owner: text("owner").notNull(),
    workspaceId: text("workspace_id").notNull(),
    revision: integer("revision").notNull().default(0),
    document: text("document").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.owner, table.workspaceId] })],
);
