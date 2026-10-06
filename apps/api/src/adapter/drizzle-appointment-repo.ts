import { and, asc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../lib/db.js";
import { appointment } from "../schema/appointment-schema.js";
import { calender } from "../schema/acuity-schema.js";
import { user } from "../schema/auth-schema.js";
import type {
  AppointmentFilter, AppointmentListItem, AppointmentLookup, AppointmentReader, AppointmentUpsert,
  AppointmentWriter,
} from "../ports/appointment-repo.js";

const specialist = alias(user, "specialist");
const referrer = alias(user, "referrer");

const columns = {
  id: appointment.id,
  acuityId: appointment.acuityId,
  acuityCalendarId: appointment.acuityCalendarId,
  referrerId: appointment.referrerId,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  durationMinutes: appointment.durationMinutes,
  timezone: appointment.timezone,
  appointmentTypeId: appointment.appointmentTypeId,
  type: appointment.type,
  canceled: appointment.canceled,
  examineeFirstName: appointment.examineeFirstName,
  examineeLastName: appointment.examineeLastName,
  bookerName: appointment.bookerName,
  bookerEmail: appointment.bookerEmail,
  syncedAt: appointment.syncedAt,
};

function selectListItems() {
  return db
    .select({
      ...columns,
      calendarId: calender.id,
      calendarName: calender.name,
      specialistId: calender.specialistId,
      specialistName: specialist.name,
      referrerName: referrer.name,
    })
    .from(appointment)
    .leftJoin(calender, eq(calender.acuityId, appointment.acuityCalendarId))
    .leftJoin(specialist, eq(specialist.id, calender.specialistId))
    .leftJoin(referrer, eq(referrer.id, appointment.referrerId));
}

export class DrizzleAppointmentRepository
  implements AppointmentReader, AppointmentLookup, AppointmentWriter
{
  async findById(id: string): Promise<AppointmentListItem | null> {
    const [row] = await selectListItems().where(eq(appointment.id, id)).limit(1);
    return row ?? null;
  }

  async list(filter: AppointmentFilter): Promise<AppointmentListItem[]> {
    return selectListItems()
      .where(and(
        gte(appointment.startsAt, filter.from),
        lte(appointment.startsAt, filter.to),
        filter.includeCanceled ? undefined : eq(appointment.canceled, false),
        filter.specialistId ? eq(calender.specialistId, filter.specialistId) : undefined,
        filter.referrerId ? eq(appointment.referrerId, filter.referrerId) : undefined,
      ))
      .orderBy(asc(appointment.startsAt));
  }

  async upsert(input: AppointmentUpsert): Promise<string> {
    const { referrerId, ...fields } = input;
    const [row] = await db
      .insert(appointment)
      .values({ id: crypto.randomUUID(), ...fields, referrerId: referrerId ?? null })
      .onConflictDoUpdate({
        target: appointment.acuityId,
        set: {
          ...fields,
          // only overwrite the referrer when the source produced a match
          ...(referrerId ? { referrerId } : {}),
          syncedAt: new Date(),
        },
      })
      .returning({ id: appointment.id });
    return row!.id;
  }
}
