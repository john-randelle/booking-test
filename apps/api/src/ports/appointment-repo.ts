export interface Appointment {
  id: string;
  acuityId: number;
  acuityCalendarId: number;
  referrerId: string | null;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  timezone: string;
  appointmentTypeId: number;
  type: string;
  canceled: boolean;
  examineeFirstName: string | null;
  examineeLastName: string | null;
  bookerName: string | null;
  bookerEmail: string | null;
  syncedAt: Date;
}

export interface AppointmentListItem extends Appointment {
  calendarId: string | null;
  calendarName: string | null;
  specialistId: string | null;
  specialistName: string | null;
  referrerName: string | null;
}

// Fields owned by Acuity. referrerId is optional: when undefined the stored
// referrer is left unchanged, so a booking whose form no longer matches a
// referrer (or one attributed some other way) keeps its referrer.
export interface AppointmentUpsert {
  acuityId: number;
  acuityCalendarId: number;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  timezone: string;
  appointmentTypeId: number;
  type: string;
  canceled: boolean;
  examineeFirstName: string | null;
  examineeLastName: string | null;
  bookerName: string | null;
  bookerEmail: string | null;
  referrerId?: string;
}

export interface AppointmentFilter {
  from: Date;
  to: Date;
  /** Only appointments on the calendar linked to this specialist. */
  specialistId?: string;
  /** Only appointments attributed to this referrer. */
  referrerId?: string;
  includeCanceled?: boolean;
}

export interface AppointmentReader {
  list(filter: AppointmentFilter): Promise<AppointmentListItem[]>;
}

export interface AppointmentLookup {
  findById(id: string): Promise<AppointmentListItem | null>;
}

export interface AppointmentWriter {
  /** Returns the local id of the inserted or updated appointment. */
  upsert(input: AppointmentUpsert): Promise<string>;
}
