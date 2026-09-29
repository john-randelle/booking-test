import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { calender } from "../schema/acuity-schema.js";
import { user } from "../schema/auth-schema.js";
import type {
  Calendar, CalendarListItem, CalendarUpsert, CalendarReader, CalendarWriter,
} from "../ports/calendar-repo.js";

const columns = {
  id: calender.id,
  acuityId: calender.acuityId,
  name: calender.name,
  email: calender.email,
  replyTo: calender.replyTo,
  description: calender.description,
  location: calender.location,
  timezone: calender.timezone,
  isValid: calender.isValid,
  syncedAt: calender.syncedAt,
  specialistId: calender.specialistId,
};

export class DrizzleCalendarRepository implements CalendarReader, CalendarWriter {
  async list(): Promise<CalendarListItem[]> {
    return db
      .select({ ...columns, specialistName: user.name })
      .from(calender)
      .leftJoin(user, eq(user.id, calender.specialistId));
  }

  async findById(id: string): Promise<Calendar | null> {
    const [row] = await db.select(columns).from(calender)
      .where(eq(calender.id, id)).limit(1);
    return row ?? null;
  }

  async findBySpecialistId(specialistId: string): Promise<Calendar | null> {
    const [row] = await db.select(columns).from(calender)
      .where(eq(calender.specialistId, specialistId)).limit(1);
    return row ?? null;
  }

  async findUnlinkedByEmail(email: string): Promise<Calendar | null> {
    const [row] = await db.select(columns).from(calender)
      .where(and(
        sql`lower(${calender.email}) = ${email.trim().toLowerCase()}`,
        isNull(calender.specialistId),
      ))
      .limit(1);
    return row ?? null;
  }

  async upsertFromAcuity(input: CalendarUpsert): Promise<Calendar> {
    const [row] = await db
      .insert(calender)
      .values({ id: crypto.randomUUID(), ...input })
      .onConflictDoUpdate({
        target: calender.acuityId,
        // specialistId is intentionally absent: sync never touches the link
        set: {
          name: input.name,
          email: input.email,
          replyTo: input.replyTo,
          description: input.description,
          location: input.location,
          timezone: input.timezone,
          isValid: input.isValid,
          syncedAt: new Date(),
        },
      })
      .returning(columns);
    if (!row) throw new Error("Failed to upsert calendar");
    return row;
  }

  async assignSpecialist(calendarId: string, specialistId: string | null): Promise<void> {
    await db.update(calender).set({ specialistId }).where(eq(calender.id, calendarId));
  }
}