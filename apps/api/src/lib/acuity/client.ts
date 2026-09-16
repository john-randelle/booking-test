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

function headers() {
  const credentials = Buffer.from(
    `${env.ACUITY_USER_ID}:${env.ACUITY_API_KEY}`,
  ).toString("base64");
  return { Authorization: `Basic ${credentials}`, Accept: "application/json" };
}

export async function getCalendars(): Promise<AcuityCalendar[]> {
  const res = await fetch(`${BASE_URL}/calendars`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Acuity API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<AcuityCalendar[]>;
}