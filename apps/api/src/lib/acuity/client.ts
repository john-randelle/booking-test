import { env } from "../env.js";

const BASE_URL = "https://acuityscheduling.com/api/v1";

export interface AcuityCalendar {
  id: number;
  name: string;
  email: string;
  replyTo: string;
  description: string;
  location: string;
  timezone: string;
  isValid: boolean;
}

export interface AcuityFormValue {
  fieldID: number;
  name: string;
  value: string;
}

export interface AcuityAppointment {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  datetime: string; // ISO 8601 with offset, e.g. 2026-10-02T10:00:00+1000
  duration: string; // minutes
  type: string;
  appointmentTypeID: number;
  calendarID: number;
  timezone: string;
  canceled: boolean;
  forms: { id: number; name: string; values: AcuityFormValue[] }[];
}

export interface AcuityAppointmentType {
  id: number;
  name: string;
  active: boolean | string;
  description: string;
  duration: number;
  category: string;
  private: boolean;
  calendarIDs: number[];
  formIDs: number[];
}

export interface AcuityFormField {
  id: number;
  name: string;
  required: boolean;
  // textbox | textarea | dropdown | checkbox | checkboxlist | yesno | file | address
  type: string;
  options: string[] | null;
}

export interface AcuityForm {
  id: number;
  name: string;
  description: string;
  hidden: boolean;
  fields: AcuityFormField[];
}

export interface AcuityAvailableDate {
  date: string; // YYYY-MM-DD
}

export interface AcuityAvailableTime {
  time: string; // ISO 8601 with offset
  slotsAvailable: number;
}

export interface AcuityAvailabilityQuery {
  appointmentTypeID: number;
  calendarID: number;
  timezone: string;
}

export interface AcuityNewAppointment {
  datetime: string;
  appointmentTypeID: number;
  calendarID: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  timezone: string;
  fields?: { id: number; value: string }[];
}

export interface AcuityWebhook {
  id: number;
  event: string;
  target: string;
  status: string;
}

export class AcuityHttpError extends Error {
  constructor(readonly status: number, statusText: string, readonly detail?: string) {
    super(`Acuity API error: ${status} ${statusText}${detail ? ` – ${detail}` : ""}`);
  }
}

export class AcuityNotFoundError extends Error {}

function headers() {
  const credentials = Buffer.from(
    `${env.ACUITY_USER_ID}:${env.ACUITY_API_KEY}`,
  ).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    // Acuity explains rejections (e.g. a taken slot, a missing required field)
    // in a JSON { message } body; keep it so callers can show it.
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new AcuityHttpError(res.status, res.statusText, body?.message);
  }
  return res.json() as Promise<T>;
}

export function getCalendars(): Promise<AcuityCalendar[]> {
  return request("/calendars");
}

/** Dates are YYYY-MM-DD in the account's timezone; both ends are inclusive. */
export function getAppointments(params: {
  minDate: string;
  maxDate: string;
  max: number;
  calendarID?: number;
}): Promise<AcuityAppointment[]> {
  const query = new URLSearchParams({
    minDate: params.minDate,
    maxDate: params.maxDate,
    max: String(params.max),
    showall: "true", // include canceled appointments
  });
  if (params.calendarID !== undefined) query.set("calendarID", String(params.calendarID));
  return request(`/appointments?${query}`);
}

export async function getAppointment(id: number): Promise<AcuityAppointment> {
  try {
    return await request<AcuityAppointment>(`/appointments/${id}`);
  } catch (error) {
    // Acuity answers 403 (not 404) for an id that isn't in this account.
    if (error instanceof AcuityHttpError && (error.status === 403 || error.status === 404)) {
      throw new AcuityNotFoundError(`Acuity appointment ${id} not found`);
    }
    throw error;
  }
}

export function getAppointmentTypes(): Promise<AcuityAppointmentType[]> {
  return request("/appointment-types");
}

export function getForms(): Promise<AcuityForm[]> {
  return request("/forms");
}

/** month is YYYY-MM; dates are returned in the requested timezone. */
export function getAvailableDates(
  params: AcuityAvailabilityQuery & { month: string },
): Promise<AcuityAvailableDate[]> {
  return request(`/availability/dates?${availabilityQuery(params, { month: params.month })}`);
}

/** date is YYYY-MM-DD in the requested timezone. */
export function getAvailableTimes(
  params: AcuityAvailabilityQuery & { date: string },
): Promise<AcuityAvailableTime[]> {
  return request(`/availability/times?${availabilityQuery(params, { date: params.date })}`);
}

function availabilityQuery(params: AcuityAvailabilityQuery, extra: Record<string, string>) {
  return new URLSearchParams({
    appointmentTypeID: String(params.appointmentTypeID),
    calendarID: String(params.calendarID),
    timezone: params.timezone,
    ...extra,
  });
}

/** Books through Acuity's normal rules: the slot must be free and required fields filled. */
export function createAppointment(input: AcuityNewAppointment): Promise<AcuityAppointment> {
  return request("/appointments", { method: "POST", body: JSON.stringify(input) });
}

export function listWebhooks(): Promise<AcuityWebhook[]> {
  return request("/webhooks");
}

export function createWebhook(event: string, target: string): Promise<AcuityWebhook> {
  return request("/webhooks", { method: "POST", body: JSON.stringify({ event, target }) });
}
