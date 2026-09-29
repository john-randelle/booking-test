"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api-client";

export interface SpecialistOption {
  id: string;
  name: string;
  linkedCalendarName: string | null;
}

const selectClass =
  "border-input bg-transparent text-foreground h-8 rounded-md border px-2 text-sm shadow-xs outline-none disabled:opacity-50";

export function AssignSpecialistSelect({
  calendarId,
  calendarName,
  specialistId,
  specialists,
}: {
  calendarId: string;
  calendarName: string;
  specialistId: string | null;
  specialists: SpecialistOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign(value: string) {
    setBusy(true);
    setError(null);
    const res = await clientFetch(`/api/calendars/${calendarId}/specialist`, {
      method: "PATCH",
      body: JSON.stringify({ specialistId: value || null }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not update the specialist.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={`Specialist for ${calendarName}`}
        className={selectClass}
        value={specialistId ?? ""}
        disabled={busy}
        onChange={(event) => void assign(event.target.value)}
      >
        <option value="">Not linked</option>
        {specialists.map((specialist) => {
          const linkedElsewhere =
            specialist.linkedCalendarName !== null && specialist.id !== specialistId;
          return (
            <option key={specialist.id} value={specialist.id} disabled={linkedElsewhere}>
              {specialist.name}
              {linkedElsewhere ? ` (linked to ${specialist.linkedCalendarName})` : ""}
            </option>
          );
        })}
      </select>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}