import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export interface AppointmentRow {
  id: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  type: string;
  canceled: boolean;
  examineeFirstName: string | null;
  examineeLastName: string | null;
  bookerName: string | null;
  calendarName: string | null;
  specialistName: string | null;
  referrerName: string | null;
}

// Each booking is shown in its own timezone, as Acuity does.
function dayKey(a: AppointmentRow) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: a.timezone }).format(new Date(a.startsAt));
}

function dayLabel(a: AppointmentRow) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: a.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(a.startsAt));
}

function timeRange(a: AppointmentRow) {
  const format = new Intl.DateTimeFormat("en-AU", {
    timeZone: a.timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${format.format(new Date(a.startsAt))} – ${format.format(new Date(a.endsAt))}`;
}

function examinee(a: AppointmentRow) {
  const name = [a.examineeFirstName, a.examineeLastName].filter(Boolean).join(" ");
  return name || a.bookerName || "—";
}

export function AppointmentTable({
  appointments,
  showReferrer,
}: {
  appointments: AppointmentRow[];
  showReferrer: boolean;
}) {
  if (appointments.length === 0) {
    return <p className="text-muted-foreground text-sm">No upcoming bookings.</p>;
  }

  const days = new Map<string, AppointmentRow[]>();
  for (const appointment of appointments) {
    const key = dayKey(appointment);
    days.set(key, [...(days.get(key) ?? []), appointment]);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Examinee</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Specialist</TableHead>
          {showReferrer && <TableHead>Referrer</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...days.entries()].map(([key, rows]) => [
          <TableRow key={key} className="hover:bg-transparent">
            <TableCell colSpan={showReferrer ? 5 : 4} className="bg-muted/50 font-medium">
              {dayLabel(rows[0]!)}
            </TableCell>
          </TableRow>,
          ...rows.map((a) => (
            // The examinee link stretches over the whole row, so any cell opens the case.
            <TableRow key={a.id} className="relative cursor-pointer">
              <TableCell className="tabular-nums whitespace-nowrap">{timeRange(a)}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/bookings/${a.id}`} className="after:absolute after:inset-0 hover:underline">
                  {examinee(a)}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{a.type}</TableCell>
              <TableCell>{a.specialistName ?? a.calendarName ?? "—"}</TableCell>
              {showReferrer && (
                <TableCell className="text-muted-foreground">{a.referrerName ?? "—"}</TableCell>
              )}
            </TableRow>
          )),
        ])}
      </TableBody>
    </Table>
  );
}
