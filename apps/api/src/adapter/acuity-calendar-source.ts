import { getCalendars } from "../lib/acuity/client.js";
import type { CalendarSource } from "../ports/calendar-source.js";
import type { CalendarUpsert } from "../ports/calendar-repo.js";

function blankToNull(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

export class AcuityCalendarSource implements CalendarSource {
  async fetchCalendars(): Promise<CalendarUpsert[]> {
    const calendars = await getCalendars();
    return calendars.map((c) => ({
      acuityId: c.id,
      name: c.name,
      email: blankToNull(c.email),
      replyTo: blankToNull(c.replyTo),
      description: blankToNull(c.description),
      location: c.location === "None" ? null : blankToNull(c.location),
      timezone: c.timezone,
      isValid: c.isValid,
    }));
  }
}