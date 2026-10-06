import type { AppointmentWriter } from "../ports/appointment-repo.js";
import type { BookingDetailWriter, IntakeAnswer } from "../ports/booking-detail-repo.js";
import {
  BookingRejectedError,
  type AvailabilitySource, type BookableService, type BookingCreator, type IntakeField,
  type IntakeForm, type ServiceCatalog,
} from "../ports/booking-source.js";
import type { Calendar, CalendarReader } from "../ports/calendar-repo.js";
import type { OrganizationReader } from "../ports/organization-repo.js";
import type { UserReader } from "../ports/user-repo.js";

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Intake field names (lower-cased) that hold the examinee's contact details.
const EXAMINEE_EMAIL_FIELDS = ["email", "examinee email"];
const EXAMINEE_PHONE_FIELDS = ["phone", "examinee phone"];

export interface BookableSpecialist {
  calendarId: string;
  calendarName: string;
  specialistId: string;
  specialistName: string;
  timezone: string;
}

export interface AvailabilityRequest {
  calendarId: string;
  appointmentTypeId: number;
  timezone: string;
}

export interface QuickBookingInput {
  calendarId: string;
  appointmentTypeId: number;
  /** A start time exactly as returned by availableTimes. */
  datetime: string;
  timezone: string;
  organizationId: string;
  /** Optional existing referrer user; links the case to their Bookings. */
  referrerUserId?: string;
  referrer: { firstName: string; lastName: string; email: string; phone: string };
  answers: { fieldId: number; value: string }[];
}

/** Admin "Quick schedule": pick specialist → service → slot → details, then book. */
export class BookingService {
  constructor(
    private readonly calendars: Pick<CalendarReader, "list" | "findById">,
    private readonly catalog: ServiceCatalog,
    private readonly availability: AvailabilitySource,
    private readonly creator: BookingCreator,
    private readonly appointments: AppointmentWriter,
    private readonly details: BookingDetailWriter,
    private readonly organizations: Pick<OrganizationReader, "list">,
    private readonly users: Pick<UserReader, "findById">,
  ) {}

  /** Only calendars linked to a specialist can be booked. */
  async listSpecialists(): Promise<BookableSpecialist[]> {
    const calendars = await this.calendars.list();
    return calendars
      .filter((c) => c.isValid && c.specialistId)
      .map((c) => ({
        calendarId: c.id,
        calendarName: c.name,
        specialistId: c.specialistId!,
        specialistName: c.specialistName ?? c.name,
        timezone: c.timezone,
      }))
      .sort((a, b) => a.specialistName.localeCompare(b.specialistName));
  }

  async listServices(calendarId: string): Promise<BookableService[]> {
    const calendar = await this.bookableCalendar(calendarId);
    return this.catalog.listServices(calendar.acuityId);
  }

  listIntakeForms(appointmentTypeId: number): Promise<IntakeForm[]> {
    return this.catalog.listIntakeForms(appointmentTypeId);
  }

  async availableDates(request: AvailabilityRequest & { month: string }): Promise<string[]> {
    if (!MONTH.test(request.month)) throw new ValidationError("month must be YYYY-MM");
    const query = await this.availabilityQuery(request);
    return this.availability.availableDates({ ...query, month: request.month });
  }

  async availableTimes(request: AvailabilityRequest & { date: string }): Promise<string[]> {
    if (!DAY.test(request.date)) throw new ValidationError("date must be YYYY-MM-DD");
    const query = await this.availabilityQuery(request);
    return this.availability.availableTimes({ ...query, date: request.date });
  }

  /** Books in the booking system, stores the appointment + case details; returns the appointment id. */
  async book(input: QuickBookingInput, createdById: string): Promise<string> {
    const { calendar, service } = await this.resolveService(input.calendarId, input.appointmentTypeId);
    assertTimezone(input.timezone);
    if (!input.datetime || Number.isNaN(new Date(input.datetime).getTime())) {
      throw new ValidationError("Choose a time");
    }
    const referrer = normalizeReferrer(input.referrer);
    await this.assertOrganization(input.organizationId);
    const referrerId = await this.referrerId(input.referrerUserId);

    const forms = await this.catalog.listIntakeForms(input.appointmentTypeId);
    const answers = collectAnswers(forms, input.answers);

    let booked;
    try {
      booked = await this.creator.book({
        acuityCalendarId: calendar.acuityId,
        appointmentTypeId: input.appointmentTypeId,
        datetime: input.datetime,
        timezone: input.timezone,
        firstName: referrer.firstName,
        lastName: referrer.lastName,
        email: referrer.email,
        phone: referrer.phone,
        fields: answers.map(({ fieldId, value }) => ({ id: fieldId, value })),
      });
    } catch (error) {
      if (error instanceof BookingRejectedError) throw new ValidationError(error.message);
      throw error;
    }

    // Store now rather than waiting for the webhook, so it shows in Bookings at once.
    const { referrerEmail: _ignored, ...appointment } = booked;
    const appointmentId = await this.appointments.upsert({ ...appointment, referrerId });

    try {
      await this.details.create({
        appointmentId,
        organizationId: input.organizationId,
        referrerFirstName: referrer.firstName,
        referrerLastName: referrer.lastName,
        referrerEmail: referrer.email,
        referrerPhone: referrer.phone,
        examineeEmail: answerByName(answers, EXAMINEE_EMAIL_FIELDS),
        examineePhone: answerByName(answers, EXAMINEE_PHONE_FIELDS),
        locationType: service.locationType,
        intakeAnswers: answers,
        createdById,
      });
    } catch (error) {
      // The appointment exists in Acuity and locally; only the extra details are missing.
      console.error(`[booking] appointment ${appointmentId} booked but details not saved:`, error);
      throw new Error(
        `Booked in Acuity (#${booked.acuityId}) but the case details could not be saved`,
      );
    }
    return appointmentId;
  }

  private async availabilityQuery(request: AvailabilityRequest) {
    assertTimezone(request.timezone);
    const { calendar } = await this.resolveService(request.calendarId, request.appointmentTypeId);
    return {
      acuityCalendarId: calendar.acuityId,
      appointmentTypeId: request.appointmentTypeId,
      timezone: request.timezone,
    };
  }

  private async resolveService(
    calendarId: string,
    appointmentTypeId: number,
  ): Promise<{ calendar: Calendar; service: BookableService }> {
    const calendar = await this.bookableCalendar(calendarId);
    const service = await this.catalog.findService(appointmentTypeId);
    if (!service || !service.acuityCalendarIds.includes(calendar.acuityId)) {
      throw new ValidationError("That service isn't offered on this calendar");
    }
    return { calendar, service };
  }

  private async bookableCalendar(calendarId: string): Promise<Calendar> {
    const calendar = await this.calendars.findById(calendarId);
    if (!calendar) throw new NotFoundError("Calendar not found");
    if (!calendar.specialistId) throw new ValidationError("This calendar has no specialist");
    return calendar;
  }

  private async assertOrganization(organizationId: string): Promise<void> {
    if (!organizationId) throw new ValidationError("Organisation is required");
    const organizations = await this.organizations.list();
    if (!organizations.some((o) => o.id === organizationId)) {
      throw new ValidationError("Organisation not found");
    }
  }

  private async referrerId(referrerUserId: string | undefined): Promise<string | undefined> {
    if (!referrerUserId) return undefined;
    const user = await this.users.findById(referrerUserId);
    if (!user || user.role !== "referrer") throw new ValidationError("Referrer user not found");
    return user.id;
  }
}

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    throw new ValidationError("Unknown timezone");
  }
}

function normalizeReferrer(input: QuickBookingInput["referrer"]) {
  const referrer = {
    firstName: input?.firstName?.trim() ?? "",
    lastName: input?.lastName?.trim() ?? "",
    email: input?.email?.trim().toLowerCase() ?? "",
    phone: input?.phone?.trim() ?? "",
  };
  if (!referrer.firstName || !referrer.lastName || !referrer.email || !referrer.phone) {
    throw new ValidationError("Referrer first name, last name, email and phone are required");
  }
  if (!EMAIL.test(referrer.email)) throw new ValidationError("Referrer email is invalid");
  return referrer;
}

/** Keeps answers to known fields only and checks required / allowed values. */
function collectAnswers(
  forms: IntakeForm[],
  raw: QuickBookingInput["answers"],
): IntakeAnswer[] {
  const given = new Map((raw ?? []).map((a) => [Number(a.fieldId), String(a.value ?? "").trim()]));
  const answers: IntakeAnswer[] = [];

  for (const field of forms.flatMap((f) => f.fields)) {
    const value = given.get(field.id) ?? "";
    if (!value) {
      if (field.required) throw new ValidationError(`"${field.name}" is required`);
      continue;
    }
    assertAllowed(field, value);
    answers.push({ fieldId: field.id, name: field.name, value });
  }
  return answers;
}

function assertAllowed(field: IntakeField, value: string): void {
  if (field.type === "yesno" && value !== "yes" && value !== "no") {
    throw new ValidationError(`"${field.name}" must be yes or no`);
  }
  if (field.type === "dropdown" && field.options.length > 0 && !field.options.includes(value)) {
    throw new ValidationError(`"${field.name}" has an invalid option`);
  }
}

function answerByName(answers: IntakeAnswer[], names: string[]): string | null {
  return answers.find((a) => names.includes(a.name.trim().toLowerCase()))?.value ?? null;
}
