"use client";

import { useMemo } from "react";

const selectClass =
  "border-input bg-transparent text-foreground h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none";

// Shown first: where most specialists and referrers are.
const AUSTRALIA = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Hobart",
  "Australia/Perth",
];

function label(timezone: string): string {
  return timezone.replace(/_/g, " ");
}

export function TimezoneSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (timezone: string) => void;
}) {
  const others = useMemo(() => {
    const all = Intl.supportedValuesOf("timeZone").filter((tz) => !AUSTRALIA.includes(tz));
    // The browser's zone may be an alias missing from the list; keep it selectable.
    return all.includes(value) || AUSTRALIA.includes(value) ? all : [value, ...all];
  }, [value]);

  return (
    <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <optgroup label="Australia">
        {AUSTRALIA.map((tz) => (
          <option key={tz} value={tz}>
            {label(tz)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Other">
        {others.map((tz) => (
          <option key={tz} value={tz}>
            {label(tz)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
