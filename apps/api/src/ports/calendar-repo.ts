export interface Calendar {
  id: string;
  acuityId: number;
  name: string;
  email: string | null;
  replyTo: string | null;
  description: string | null;
  location: string | null;
  timezone: string;
  isValid: boolean;
  syncedAt: Date;
  specialistId: string | null;
}

export interface CalendarListItem extends Calendar {
  specialistName: string | null;
}

export interface CalendarUpsert {
  acuityId: number;
  name: string;
  email: string | null;
  replyTo: string | null;
  description: string | null;
  location: string | null;
  timezone: string;
  isValid: boolean;
}

export interface CalendarReader {
  list(): Promise<CalendarListItem[]>;
  findById(id: string): Promise<Calendar | null>;
  findBySpecialistId(specialistId: string): Promise<Calendar | null>;
  findUnlinkedByEmail(email: string): Promise<Calendar | null>;
}

export interface CalendarWriter {
  upsertFromAcuity(input: CalendarUpsert): Promise<Calendar>;
  assignSpecialist(calendarId: string, specialistId: string | null): Promise<void>;
}