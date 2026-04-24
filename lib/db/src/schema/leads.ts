import { pgTable, serial, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  productInterest: text("product_interest").notNull(),
  source: text("source").notNull(),
  campaignId: integer("campaign_id"),
  assignedToId: integer("assigned_to_id"),
  stage: varchar("stage", { length: 16 }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leadsTable.$inferSelect;
export type InsertLead = typeof leadsTable.$inferInsert;
