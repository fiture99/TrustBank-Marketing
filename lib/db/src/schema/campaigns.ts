import { pgTable, serial, text, varchar, numeric, integer, date } from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: varchar("channel", { length: 16 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 14, scale: 2 }).notNull(),
  spent: numeric("spent", { precision: 14, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 16 }).notNull(),
  targetAudience: text("target_audience").notNull(),
  ownerId: integer("owner_id").notNull(),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type InsertCampaign = typeof campaignsTable.$inferInsert;
