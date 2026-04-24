import { pgTable, serial, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  channel: varchar("channel", { length: 16 }).notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("sent"),
  recipientCount: integer("recipient_count").notNull().default(1),
  sentById: integer("sent_by_id").notNull(),
  campaignId: integer("campaign_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inboxAlertsTable = pgTable("inbox_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 16 }).notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: varchar("channel", { length: 16 }).notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
export type InboxAlert = typeof inboxAlertsTable.$inferSelect;
export type InsertInboxAlert = typeof inboxAlertsTable.$inferInsert;
export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplatesTable.$inferInsert;
