"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";

import { useApiQuery } from "@/lib/use-api-query";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldLabel } from "@workspace/ui/components/field";

import { StepMessage } from "./option-card";
import { TimezoneSelect } from "./timezone-select";
import type { Service, Specialist } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "YYYY-MM" for today in `timezone`. */
function currentMonth(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" })
    .format(new Date())
    .slice(0, 7);
}

/** "YYYY-MM-DD" of an instant in `timezone`. */
function dayOf(datetime: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(datetime));
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year!, m! - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

/** Blank cells before day 1 (Monday-first) and the days of the month as YYYY-MM-DD. */
function monthGrid(month: string): { blanks: number; days: string[] } {
  const [year, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year!, m! - 1, 1)).getUTCDay(); // 0 = Sunday
  const count = new Date(Date.UTC(year!, m!, 0)).getUTCDate();
  return {
    blanks: (firstWeekday + 6) % 7,
    days: Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  };
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
}

function timeLabel(datetime: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: timezone, hour: "numeric", minute: "2-digit" })
    .format(new Date(datetime));
}

export function StepDateTime({
  specialist,
  service,
  timezone,
  onTimezoneChange,
  datetime,
  onSelect,
}: {
  specialist: Specialist;
  service: Service;
  timezone: string;
  onTimezoneChange: (timezone: string) => void;
  datetime: string | null;
  onSelect: (datetime: string) => void;
}) {
  const thisMonth = currentMonth(timezone);
  // Coming back to this step: reopen on the day of the time already chosen.
  const [date, setDate] = useState<string | null>(() => (datetime ? dayOf(datetime, timezone) : null));
  const [month, setMonth] = useState(() => date?.slice(0, 7) ?? thisMonth);

  const base =
    `calendarId=${encodeURIComponent(specialist.calendarId)}` +
    `&appointmentTypeId=${service.id}&timezone=${encodeURIComponent(timezone)}`;
  const dates = useApiQuery<string[]>(`/api/booking/availability/dates?${base}&month=${month}`);
  const times = useApiQuery<string[]>(
    date ? `/api/booking/availability/times?${base}&date=${date}` : null,
  );

  const available = new Set(dates.data ?? []);
  const { blanks, days } = monthGrid(month);

  function changeMonth(delta: number) {
    setMonth(shiftMonth(month, delta));
    setDate(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="qs-timezone">Timezone</FieldLabel>
        <TimezoneSelect
          id="qs-timezone"
          value={timezone}
          onChange={(tz) => {
            onTimezoneChange(tz);
            setDate(null);
          }}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={month <= thisMonth}
            onClick={() => changeMonth(-1)}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <span className="font-medium">{monthLabel(month)}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => changeMonth(1)}>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
        </div>

        <div className="text-muted-foreground grid grid-cols-7 text-center text-xs">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const open = available.has(day);
            return (
              <button
                key={day}
                type="button"
                disabled={!open}
                aria-pressed={date === day}
                onClick={() => setDate(day)}
                className={cn(
                  "h-9 rounded-md text-sm tabular-nums transition-colors",
                  open ? "hover:bg-muted font-medium" : "text-muted-foreground/40",
                  date === day && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>
        {dates.loading && <p className="text-muted-foreground text-xs">Checking availability…</p>}
        {dates.error && <p className="text-destructive text-xs">{dates.error}</p>}
        {dates.data && dates.data.length === 0 && (
          <p className="text-muted-foreground text-xs">No availability this month.</p>
        )}
      </div>

      {date && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Available times</span>
          {times.loading && <StepMessage>Loading times…</StepMessage>}
          {times.error && <p className="text-destructive text-xs">{times.error}</p>}
          {times.data?.length === 0 && <StepMessage>No times left on this day.</StepMessage>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {times.data?.map((time) => (
              <Button
                key={time}
                variant={datetime === time ? "default" : "outline"}
                size="sm"
                onClick={() => onSelect(time)}
              >
                {timeLabel(time, timezone)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
