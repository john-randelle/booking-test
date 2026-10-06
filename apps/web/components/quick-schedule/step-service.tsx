"use client";

import { useApiQuery } from "@/lib/use-api-query";

import { OptionCard, StepMessage } from "./option-card";
import { LOCATION_LABEL, type Service, type Specialist } from "./types";

export function StepService({
  specialist,
  selected,
  onSelect,
}: {
  specialist: Specialist;
  selected: Service | null;
  onSelect: (service: Service) => void;
}) {
  const { data, error, loading } = useApiQuery<Service[]>(
    `/api/booking/services?calendarId=${encodeURIComponent(specialist.calendarId)}`,
  );

  if (loading) return <StepMessage>Loading services…</StepMessage>;
  if (error) return <StepMessage>{error}</StepMessage>;
  if (!data?.length) return <StepMessage>{specialist.specialistName} has no bookable services.</StepMessage>;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {data.map((service) => (
        <OptionCard
          key={service.id}
          selected={selected?.id === service.id}
          onSelect={() => onSelect(service)}
          title={LOCATION_LABEL[service.locationType]}
          subtitle={`${service.name} · ${service.durationMinutes} min`}
        />
      ))}
    </div>
  );
}
