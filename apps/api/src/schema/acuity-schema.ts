import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const calender = pgTable("calendar", {
  id: text("id").primaryKey(),
  acuityId: integer("acuity_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  replyTo: text("reply_to"),
  description: text("description"),
  location: text("location"),
  timezone: text("timezone").notNull(),
  isValid: boolean("is_valid").notNull().default(true),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});