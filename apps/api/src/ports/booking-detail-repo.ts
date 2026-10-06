import type { LocationType } from "./booking-source.js";

export interface IntakeAnswer {
  fieldId: number;
  name: string;
  value: string;
}

export interface BookingDetail {
  id: string;
  appointmentId: string;
  organizationId: string | null;
  organizationName: string | null;
  referrerFirstName: string;
  referrerLastName: string;
  referrerEmail: string;
  referrerPhone: string | null;
  examineeEmail: string | null;
  examineePhone: string | null;
  locationType: LocationType;
  intakeAnswers: IntakeAnswer[];
  createdById: string | null;
  createdAt: Date;
}

export type BookingDetailCreate = Omit<
  BookingDetail,
  "id" | "organizationName" | "createdAt"
>;

export interface BookingDetailReader {
  findByAppointmentId(appointmentId: string): Promise<BookingDetail | null>;
}

export interface BookingDetailWriter {
  create(input: BookingDetailCreate): Promise<BookingDetail>;
}
