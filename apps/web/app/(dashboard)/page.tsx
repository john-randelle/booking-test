import Link from "next/link";
import { redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import { AppointmentTable, type AppointmentRow } from "@/components/appointments/appointment-table";
import { SyncAppointmentsButton } from "@/components/appointments/sync-appointments-button";
import { RefreshMyBookingsButton } from "@/components/appointments/refresh-my-bookings-button";
import { Button } from "@workspace/ui/components/button";

const SUBTITLE: Record<string, string> = {
  admin: "All bookings in the next 30 days",
  specialist: "Your bookings in the next 30 days",
  referrer: "Bookings you referred in the next 30 days",
};

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  const isAdmin = me.role === "admin";

  // The API defaults to the next 30 days and scopes results to the caller's role.
  const res = await apiFetch("/api/appointments");
  if (!res.ok) {
    throw new Error(`Failed to load bookings: ${res.status}`);
  }
  const appointments: AppointmentRow[] = await res.json();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Bookings</h1>
          <p className="text-muted-foreground text-sm">
            {SUBTITLE[me.role ?? ""] ?? "Upcoming bookings"} · {appointments.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <SyncAppointmentsButton />}
          {me.role === "specialist" && <RefreshMyBookingsButton />}
          <Button variant="outline" nativeButton={false} render={<Link href="/calendars" />}>
            View calendars
          </Button>
        </div>
      </div>

      <AppointmentTable appointments={appointments} showReferrer={me.role !== "referrer"} />
    </div>
  );
}
