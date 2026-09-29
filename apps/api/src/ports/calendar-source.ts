import type { CalendarUpsert } from "./calendar-repo.js";

export interface CalendarSource {
  fetchCalendars(): Promise<CalendarUpsert[]>;
}