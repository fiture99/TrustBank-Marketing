import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const appStateTable = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: integer("value"),
});
