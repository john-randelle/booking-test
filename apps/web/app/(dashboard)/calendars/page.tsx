import Link from "next/link";
import { redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import type { UserRow } from "@/components/users/user-table";
import {
  AssignSpecialistSelect,
  type SpecialistOption,
} from "@/components/calendars/assign-specialist-select";
import { SyncCalendarsButton } from "@/components/calendars/sync-calendars-button";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface Calendar {
  id: string;
  acuityId: number;
  name: string;
  email: string | null;
  replyTo: string | null;
  description: string | null;
  location: string | null;
  timezone: string;
  isValid: boolean;
  syncedAt: string;
  specialistId: string | null;
  specialistName: string | null;
}

function displayName(user: UserRow) {
  return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name;
}

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const isAdmin = me.role === "admin";

  // Only admins can list users, so only admins fetch the specialist options.
  const [calendarsRes, usersRes] = await Promise.all([
    apiFetch("/api/calendars"),
    isAdmin ? apiFetch("/api/users") : Promise.resolve(null),
  ]);

  if (!calendarsRes.ok) {
    throw new Error(`Failed to load calendars: ${calendarsRes.status}`);
  }

  const calendars: Calendar[] = await calendarsRes.json();
  const users: UserRow[] = usersRes?.ok ? await usersRes.json() : [];

  const calendarBySpecialist = new Map(
    calendars
      .filter((calendar) => calendar.specialistId)
      .map((calendar) => [calendar.specialistId!, calendar.name]),
  );

  const specialists: SpecialistOption[] = users
    .filter((user) => user.role === "specialist")
    .map((user) => ({
      id: user.id,
      name: displayName(user),
      linkedCalendarName: calendarBySpecialist.get(user.id) ?? null,
    }));

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Specialists</h1>
          <p className="text-muted-foreground text-sm">
            {calendars.length} synced from Acuity
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <SyncCalendarsButton />}
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Back to dashboard
          </Button>
        </div>
      </div>

      {calendars.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {isAdmin
            ? "No calendars yet. Use “Sync from Acuity” to pull them in."
            : "No calendars yet."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Specialist</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Acuity ID</TableHead>
              <TableHead>Last synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calendars.map((calendar) => (
              <TableRow key={calendar.id}>
                <TableCell className="font-medium">{calendar.name}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <AssignSpecialistSelect
                      calendarId={calendar.id}
                      calendarName={calendar.name}
                      specialistId={calendar.specialistId}
                      specialists={specialists}
                    />
                  ) : (
                    calendar.specialistName ?? "—"
                  )}
                </TableCell>
                <TableCell>{calendar.timezone}</TableCell>
                <TableCell className="text-muted-foreground">
                  {calendar.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {calendar.acuityId}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(calendar.syncedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}