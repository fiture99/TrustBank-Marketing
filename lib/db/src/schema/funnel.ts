import { pgTable, integer, varchar } from "drizzle-orm/pg-core";

export const funnelTable = pgTable("funnel", {
  id: varchar("id", { length: 16 }).primaryKey(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
});

export const monthlyTrendTable = pgTable("monthly_trend", {
  month: varchar("month", { length: 8 }).primaryKey(),
  leads: integer("leads").notNull(),
  conversions: integer("conversions").notNull(),
});
