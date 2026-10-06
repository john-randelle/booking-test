import {
  AcuityHttpError, createAppointment, getAppointmentTypes, getAvailableDates, getAvailableTimes,
  getForms, type AcuityAppointmentType, type AcuityForm,
} from "../lib/acuity/client.js";
import type { SourceAppointment } from "../ports/appointment-source.js";
import {
  BookingRejectedError,
  type AvailabilityQuery, type AvailabilitySource, type BookableService, type BookingCreator,
  type IntakeForm, type LocationType, type NewBooking, type ServiceCatalog,
} from "../ports/booking-source.js";
import { toSourceAppointment } from "./acuity-appointment-source.js";

// Appointment types and forms rarely change, but one wizard run reads them
// several times; a short cache keeps us well under Acuity's rate limit.
const CACHE_MS = 60_000;

// Acuity has no telehealth flag; the account names types "… - Telehealth".
const TELEHEALTH_PATTERN = /tele|online|video|phone/i;

function locationTypeOf(t: AcuityAppointmentType): LocationType {
  return TELEHEALTH_PATTERN.test(`${t.name} ${t.category}`) ? "telehealth" : "in_person";
}

function isActive(t: AcuityAppointmentType): boolean {
  // Acuity has returned both booleans and "true"/"false" strings here.
  return t.active === true || t.active === "true";
}

function toService(t: AcuityAppointmentType): BookableService {
  return {
    id: t.id,
    name: t.name.trim(),
    durationMinutes: t.duration,
    locationType: locationTypeOf(t),
    acuityCalendarIds: t.calendarIDs ?? [],
    formIds: t.formIDs ?? [],
  };
}

function toIntakeForm(f: AcuityForm): IntakeForm {
  return {
    id: f.id,
    name: f.name,
    description: f.description ?? "",
    fields: (f.fields ?? []).map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required,
      options: field.options ?? [],
    })),
  };
}

class Cached<T> {
  private value: Promise<T> | null = null;
  private loadedAt = 0;

  constructor(private readonly load: () => Promise<T>) {}

  get(now = Date.now()): Promise<T> {
    if (!this.value || now - this.loadedAt > CACHE_MS) {
      this.loadedAt = now;
      this.value = this.load().catch((error) => {
        this.value = null; // don't cache a failure
        throw error;
      });
    }
    return this.value;
  }
}

export class AcuityBookingSource implements ServiceCatalog, AvailabilitySource, BookingCreator {
  private readonly types = new Cached(getAppointmentTypes);
  private readonly forms = new Cached(getForms);
  private readonly referrerField: string;

  constructor(referrerFieldName: string) {
    this.referrerField = referrerFieldName.trim().toLowerCase();
  }

  async listServices(acuityCalendarId: number): Promise<BookableService[]> {
    const types = await this.types.get();
    return types
      .filter((t) => isActive(t) && (t.calendarIDs ?? []).includes(acuityCalendarId))
      .map(toService);
  }

  async findService(appointmentTypeId: number): Promise<BookableService | null> {
    const type = (await this.types.get()).find((t) => t.id === appointmentTypeId);
    return type && isActive(type) ? toService(type) : null;
  }

  async listIntakeForms(appointmentTypeId: number): Promise<IntakeForm[]> {
    const service = await this.findService(appointmentTypeId);
    if (!service) return [];
    const forms = await this.forms.get();
    return service.formIds
      .map((id) => forms.find((f) => f.id === id))
      .filter((f): f is AcuityForm => f !== undefined)
      .map(toIntakeForm);
  }

  async availableDates(query: AvailabilityQuery & { month: string }): Promise<string[]> {
    const dates = await getAvailableDates({ ...this.acuityQuery(query), month: query.month });
    return dates.map((d) => d.date);
  }

  async availableTimes(query: AvailabilityQuery & { date: string }): Promise<string[]> {
    const times = await getAvailableTimes({ ...this.acuityQuery(query), date: query.date });
    return times.filter((t) => t.slotsAvailable > 0).map((t) => t.time);
  }

  async book(input: NewBooking): Promise<SourceAppointment> {
    try {
      const created = await createAppointment({
        datetime: input.datetime,
        appointmentTypeID: input.appointmentTypeId,
        calendarID: input.acuityCalendarId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        timezone: input.timezone,
        fields: input.fields,
      });
      return toSourceAppointment(created, this.referrerField);
    } catch (error) {
      // 400/422: Acuity rejected the input (slot gone, missing field). Anything
      // else (auth, outage) is ours to surface as a server error.
      if (error instanceof AcuityHttpError && (error.status === 400 || error.status === 422)) {
        throw new BookingRejectedError(error.detail ?? "Acuity rejected the booking");
      }
      throw error;
    }
  }

  private acuityQuery(query: AvailabilityQuery) {
    return {
      appointmentTypeID: query.appointmentTypeId,
      calendarID: query.acuityCalendarId,
      timezone: query.timezone,
    };
  }
}
