import { pgTable, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const appointment = pgTable(
  "appointment",
  {
    id: text("id").primaryKey(),
    acuityId: integer("acuity_id").notNull().unique(),
    // Joined to calendar.acuity_id rather than a FK, so a booking that arrives
    // before its calendar is synced links up once the calendar exists.
    acuityCalendarId: integer("acuity_calendar_id").notNull(),
    referrerId: text("referrer_id").references(() => user.id, { onDelete: "set null" }),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    timezone: text("timezone").notNull(),
    appointmentTypeId: integer("appointment_type_id").notNull(),
    type: text("type").notNull(),
    canceled: boolean("canceled").notNull().default(false),

    // Who the appointment is for (intake form) and who filled in the booking.
    // Other intake answers (DOB, address, condition, notes) stay in Acuity.
    examineeFirstName: text("examinee_first_name"),
    examineeLastName: text("examinee_last_name"),
    bookerName: text("booker_name"),
    bookerEmail: text("booker_email"),

    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("appointment_calendar_starts_idx").on(table.acuityCalendarId, table.startsAt),
    index("appointment_referrer_starts_idx").on(table.referrerId, table.startsAt),
  ],
);
