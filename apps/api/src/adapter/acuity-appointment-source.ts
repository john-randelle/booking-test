import {
  AcuityNotFoundError, getAppointment, getAppointments, type AcuityAppointment,
} from "../lib/acuity/client.js";
import type { AppointmentSource, SourceAppointment } from "../ports/appointment-source.js";

// Acuity returns at most this many appointments per request and has no page
// offset, so a full response means the date range must be split.
const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

// Intake form field names, matched case-insensitively.
const EXAMINEE_FIRST_NAME = "examinee first name";
const EXAMINEE_LAST_NAME = "examinee last name";

function blankToNull(value: string | null | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class AcuityAppointmentSource implements AppointmentSource {
  private readonly referrerField: string;

  constructor(referrerFieldName: string) {
    this.referrerField = referrerFieldName.trim().toLowerCase();
  }

  async fetchRange(
    from: Date,
    to: Date,
    options: { acuityCalendarId?: number } = {},
  ): Promise<SourceAppointment[]> {
    // Acuity filters by whole days in the account timezone; pad a day either
    // side so nothing near the edges is missed (upserts are idempotent).
    const appointments = await this.fetchDays(
      new Date(from.getTime() - DAY_MS),
      new Date(to.getTime() + DAY_MS),
      options.acuityCalendarId,
    );
    return appointments.map((a) => this.toSource(a));
  }

  async fetchOne(acuityId: number): Promise<SourceAppointment | null> {
    try {
      return this.toSource(await getAppointment(acuityId));
    } catch (error) {
      if (error instanceof AcuityNotFoundError) return null;
      throw error;
    }
  }

  private async fetchDays(
    from: Date,
    to: Date,
    calendarID?: number,
  ): Promise<AcuityAppointment[]> {
    const page = await getAppointments({
      minDate: toDay(from),
      maxDate: toDay(to),
      max: PAGE_SIZE,
      calendarID,
    });
    if (page.length < PAGE_SIZE) return page;

    const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);
    if (days < 1) {
      console.warn(`[acuity] ${toDay(from)} has ${PAGE_SIZE}+ appointments; some were not synced`);
      return page;
    }

    const middle = new Date(from.getTime() + Math.floor(days / 2) * DAY_MS);
    const [first, second] = await Promise.all([
      this.fetchDays(from, middle, calendarID),
      this.fetchDays(new Date(middle.getTime() + DAY_MS), to, calendarID),
    ]);
    return [...first, ...second];
  }

  private toSource(a: AcuityAppointment): SourceAppointment {
    return toSourceAppointment(a, this.referrerField);
  }
}

/** Maps an Acuity appointment; referrerField is the lower-cased intake field name. */
export function toSourceAppointment(a: AcuityAppointment, referrerField: string): SourceAppointment {
  const startsAt = new Date(a.datetime);
  const durationMinutes = Number.parseInt(a.duration, 10) || 0;

  return {
    acuityId: a.id,
    acuityCalendarId: a.calendarID,
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
    durationMinutes,
    timezone: a.timezone,
    appointmentTypeId: a.appointmentTypeID,
    type: a.type,
    canceled: a.canceled,
    examineeFirstName: formValue(a, EXAMINEE_FIRST_NAME),
    examineeLastName: formValue(a, EXAMINEE_LAST_NAME),
    bookerName: blankToNull(`${a.firstName ?? ""} ${a.lastName ?? ""}`),
    bookerEmail: blankToNull(a.email),
    referrerEmail: formValue(a, referrerField),
  };
}

function formValue(a: AcuityAppointment, fieldName: string): string | null {
  for (const form of a.forms ?? []) {
    for (const field of form.values ?? []) {
      if (field.name.trim().toLowerCase() === fieldName) return blankToNull(field.value);
    }
  }
  return null;
}
