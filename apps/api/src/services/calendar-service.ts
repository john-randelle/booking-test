import type { Calendar, CalendarListItem, CalendarReader, CalendarWriter } from "../ports/calendar-repo.js";
import type { CalendarSource } from "../ports/calendar-source.js";
import type { SpecialistLookup } from "../ports/user-repo.js";
import type { CalendarLinker } from "../ports/calendar-linker.js";

export class ConflictError extends Error {}
export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export interface SyncResult {
  synced: number;
  linked: number;
}

export class CalendarService implements CalendarLinker {
  constructor(
    private readonly calendars: CalendarReader & CalendarWriter,
    private readonly source: CalendarSource,
    private readonly specialists: SpecialistLookup,
  ) {}

  list(): Promise<CalendarListItem[]> {
    return this.calendars.list();
  }

  async sync(): Promise<SyncResult> {
    const incoming = await this.source.fetchCalendars();
    let linked = 0;

    for (const input of incoming) {
      const saved = await this.calendars.upsertFromAcuity(input);
      if (await this.autoLink(saved)) linked++;
    }

    return { synced: incoming.length, linked };
  }

  async assignSpecialist(calendarId: string, specialistId: string | null): Promise<void> {
    const calendar = await this.calendars.findById(calendarId);
    if (!calendar) throw new NotFoundError("Calendar not found");

    if (specialistId === null) {
      await this.calendars.assignSpecialist(calendarId, null);
      return;
    }

    const specialist = await this.specialists.findSpecialistById(specialistId);
    if (!specialist) throw new ValidationError("User is not a specialist");

    const current = await this.calendars.findBySpecialistId(specialistId);
    if (current && current.id !== calendarId) {
      throw new ConflictError(`${specialist.name} is already linked to calendar "${current.name}"`);
    }

    await this.calendars.assignSpecialist(calendarId, specialistId);
  }

  async linkSpecialist(userId: string): Promise<boolean> {
    const specialist = await this.specialists.findSpecialistById(userId);
    if (!specialist) return false;

    if (await this.calendars.findBySpecialistId(specialist.id)) return false;

    const calendar = await this.calendars.findUnlinkedByEmail(specialist.email);
    if (!calendar) return false;

    await this.calendars.assignSpecialist(calendar.id, specialist.id);
    return true;
  }

  async unlinkSpecialist(userId: string): Promise<void> {
    const calendar = await this.calendars.findBySpecialistId(userId);
    if (calendar) await this.calendars.assignSpecialist(calendar.id, null);
  }

  // Links an unlinked calendar to the specialist whose email matches it.
  private async autoLink(calendar: Calendar): Promise<boolean> {
    if (calendar.specialistId || !calendar.email) return false;

    const specialist = await this.specialists.findSpecialistByEmail(calendar.email);
    if (!specialist) return false;

    // two Acuity calendars share one email: first one wins, the rest stay manual
    if (await this.calendars.findBySpecialistId(specialist.id)) return false;

    await this.calendars.assignSpecialist(calendar.id, specialist.id);
    return true;
  }
}