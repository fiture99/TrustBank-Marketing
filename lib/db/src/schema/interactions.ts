import { pgTable, serial, text, varchar, integer, timestamp, date } from "drizzle-orm/pg-core";

export const interactionsTable = pgTable("interactions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  type: varchar("type", { length: 16 }).notNull(),
  notes: text("notes").notNull(),
  salesOfficerId: integer("sales_officer_id").notNull(),
  nextFollowUp: date("next_follow_up"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Interaction = typeof interactionsTable.$inferSelect;
export type InsertInteraction = typeof interactionsTable.$inferInsert;
