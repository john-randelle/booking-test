import type { SourceAppointment } from "./appointment-source.js";

export type LocationType = "telehealth" | "in_person";

/** An appointment type that can be booked on a specialist's calendar. */
export interface BookableService {
  id: number;
  name: string;
  durationMinutes: number;
  locationType: LocationType;
  acuityCalendarIds: number[];
  formIds: number[];
}

export interface IntakeField {
  id: number;
  name: string;
  /** Acuity field type: textbox | textarea | dropdown | checkbox | checkboxlist | yesno | file | address */
  type: string;
  required: boolean;
  options: string[];
}

export interface IntakeForm {
  id: number;
  name: string;
  description: string;
  fields: IntakeField[];
}

export interface AvailabilityQuery {
  acuityCalendarId: number;
  appointmentTypeId: number;
  timezone: string;
}

export interface NewBooking {
  acuityCalendarId: number;
  appointmentTypeId: number;
  /** ISO 8601 with offset, exactly as returned by availableTimes. */
  datetime: string;
  timezone: string;
  /** Who Acuity records as the client: the referrer. */
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  fields: { id: number; value: string }[];
}

export interface ServiceCatalog {
  /** Active services on this calendar. */
  listServices(acuityCalendarId: number): Promise<BookableService[]>;
  findService(appointmentTypeId: number): Promise<BookableService | null>;
  /** The intake forms attached to a service, in Acuity's order. */
  listIntakeForms(appointmentTypeId: number): Promise<IntakeForm[]>;
}

export interface AvailabilitySource {
  /** Dates (YYYY-MM-DD) in `month` (YYYY-MM) with at least one free slot. */
  availableDates(query: AvailabilityQuery & { month: string }): Promise<string[]>;
  /** Free start times (ISO 8601 with offset) on `date` (YYYY-MM-DD). */
  availableTimes(query: AvailabilityQuery & { date: string }): Promise<string[]>;
}

/** The booking system refused the booking (slot taken, a required field missing, …). */
export class BookingRejectedError extends Error {}

export interface BookingCreator {
  /** Throws BookingRejectedError when the booking system refuses the input. */
  book(input: NewBooking): Promise<SourceAppointment>;
}
