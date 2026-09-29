import type { AppointmentUpsert } from "./appointment-repo.js";

/** An appointment as the booking system reports it, before referrer matching. */
export interface SourceAppointment extends Omit<AppointmentUpsert, "referrerId"> {
  /** Value of the "referrer email" intake field, if the booking has one. */
  referrerEmail: string | null;
}

export interface AppointmentSource {
  /**
   * All appointments (including canceled) starting within [from, to],
   * optionally only those on one calendar.
   */
  fetchRange(
    from: Date,
    to: Date,
    options?: { acuityCalendarId?: number },
  ): Promise<SourceAppointment[]>;
  /** A single appointment, or null if it no longer exists. */
  fetchOne(acuityId: number): Promise<SourceAppointment | null>;
}
