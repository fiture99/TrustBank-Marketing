import { pgTable, serial, text, varchar, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";

export const dealsTable = pgTable("deals", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  productType: text("product_type").notNull(),
  value: numeric("value", { precision: 14, scale: 2 }).notNull(),
  stage: varchar("stage", { length: 16 }).notNull(),
  expectedCloseDate: date("expected_close_date").notNull(),
  salesOfficerId: integer("sales_officer_id").notNull(),
  leadId: integer("lead_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Deal = typeof dealsTable.$inferSelect;
export type InsertDeal = typeof dealsTable.$inferInsert;
