// Shapes returned by /api/booking/* (see apps/api/src/services/booking-service.ts).

export interface Specialist {
  calendarId: string;
  calendarName: string;
  specialistId: string;
  specialistName: string;
  timezone: string;
}

export type LocationType = "telehealth" | "in_person";

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  locationType: LocationType;
}

export interface IntakeField {
  id: number;
  name: string;
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

export interface OrganizationOption {
  id: string;
  name: string;
}

export interface ReferrerOption {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  organizationId: string | null;
}

export interface ReferrerDetails {
  organizationId: string;
  referrerUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export const LOCATION_LABEL: Record<LocationType, string> = {
  telehealth: "Telehealth",
  in_person: "Face to face",
};
