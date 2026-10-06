"use client";

import { useApiQuery } from "@/lib/use-api-query";

import { OptionCard, StepMessage } from "./option-card";
import type { Specialist } from "./types";

export function StepSpecialist({
  selected,
  onSelect,
}: {
  selected: Specialist | null;
  onSelect: (specialist: Specialist) => void;
}) {
  const { data, error, loading } = useApiQuery<Specialist[]>("/api/booking/specialists");

  if (loading) return <StepMessage>Loading specialists…</StepMessage>;
  if (error) return <StepMessage>{error}</StepMessage>;
  if (!data?.length) {
    return <StepMessage>No specialists yet. Link a calendar to a specialist on the Specialists page.</StepMessage>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {data.map((specialist) => (
        <OptionCard
          key={specialist.calendarId}
          selected={selected?.calendarId === specialist.calendarId}
          onSelect={() => onSelect(specialist)}
          title={specialist.specialistName}
          subtitle={`${specialist.calendarName} · ${specialist.timezone.replace(/_/g, " ")}`}
        />
      ))}
    </div>
  );
}
