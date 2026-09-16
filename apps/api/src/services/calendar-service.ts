import { db } from "../lib/db.js";
import { calender } from "../schema/acuity-schema.js";
import { getCalendars } from "../lib/acuity/client.js";

export async function syncCalendars() {
  const acuityCalendars = await getCalendars();

  for (const c of acuityCalendars) {
    await db
      .insert(calender)
      .values({
        id: crypto.randomUUID(),
        acuityId: c.id,
        name: c.name,
        email: c.email || null,
        replyTo: c.replyTo || null,
        description: c.description || null,
        location: c.location === "None" ? null : c.location || null,
        timezone: c.timezone,
        isValid: c.isValid,
      })
      .onConflictDoUpdate({
        target: calender.acuityId,
        set: {
          name: c.name,
          email: c.email || null,
          timezone: c.timezone,
          isValid: c.isValid,
          syncedAt: new Date(),
        },
      });
  }

  return { synced: acuityCalendars.length };
}

export async function listCalendars() {
  return db.select().from(calender);
}