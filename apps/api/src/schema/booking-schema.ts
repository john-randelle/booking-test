import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema.js";
import { appointment } from "./appointment-schema.js";
import type { IntakeAnswer } from "../ports/booking-detail-repo.js";

// Details captured when an admin books through Quick schedule. Kept apart from
// `appointment` so the Acuity sync's upsert never overwrites them; synced-only
// appointments simply have no row here.
export const bookingDetail = pgTable("booking_detail", {
  id: text("id").primaryKey(),
  appointmentId: text("appointment_id")
    .notNull()
    .unique()
    .references(() => appointment.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "set null",
  }),

  referrerFirstName: text("referrer_first_name").notNull(),
  referrerLastName: text("referrer_last_name").notNull(),
  referrerEmail: text("referrer_email").notNull(),
  referrerPhone: text("referrer_phone"),

  examineeEmail: text("examinee_email"),
  examineePhone: text("examinee_phone"),

  // "telehealth" | "in_person"
  locationType: text("location_type").notNull(),
  intakeAnswers: jsonb("intake_answers").$type<IntakeAnswer[]>().notNull().default([]),

  createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
