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

export interface AcuityWebhook {
  id: number;
  event: string;
  target: string;
  status: string;
}

export class AcuityHttpError extends Error {
  constructor(readonly status: number, statusText: string) {
    super(`Acuity API error: ${status} ${statusText}`);
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
  if (!res.ok) throw new AcuityHttpError(res.status, res.statusText);
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

export function listWebhooks(): Promise<AcuityWebhook[]> {
  return request("/webhooks");
}

export function createWebhook(event: string, target: string): Promise<AcuityWebhook> {
  return request("/webhooks", { method: "POST", body: JSON.stringify({ event, target }) });
}
