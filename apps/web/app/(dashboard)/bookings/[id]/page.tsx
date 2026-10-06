import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import {
  BookingSummaryCard,
  ExamineeCard,
  IntakeAnswersCard,
  ReferrerCard,
  examineeName,
  type CaseData,
} from "@/components/cases/case-detail-cards";
import { Button } from "@workspace/ui/components/button";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { id } = await params;

  // The API returns 404 both for a missing case and one this user may not open.
  const res = await apiFetch(`/api/cases/${encodeURIComponent(id)}`);
  if (res.status === 404) notFound();
  if (!res.ok) {
    throw new Error(`Failed to load case: ${res.status}`);
  }
  const data: CaseData = await res.json();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium">{examineeName(data)}</h1>
          <p className="text-muted-foreground text-sm">
            {data.appointment.type}
            {data.appointment.canceled && " · Canceled"}
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Back to bookings
        </Button>
      </div>

      {!data.details && (
        <p className="text-muted-foreground text-sm">
          This booking was made directly in Acuity, so only the synced summary is available.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <BookingSummaryCard data={data} />
        <div className="flex flex-col gap-4">
          <ExamineeCard data={data} />
          <ReferrerCard data={data} />
        </div>
        {data.details && (
          <div className="lg:col-span-2">
            <IntakeAnswersCard data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
