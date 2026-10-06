import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";

// Shape of GET /api/cases/:id (see apps/api/src/services/case-service.ts).
export interface CaseData {
  appointment: {
    id: string;
    acuityId: number;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    timezone: string;
    type: string;
    canceled: boolean;
    examineeFirstName: string | null;
    examineeLastName: string | null;
    bookerName: string | null;
    bookerEmail: string | null;
    calendarName: string | null;
    specialistName: string | null;
    referrerName: string | null;
  };
  details: {
    organizationName: string | null;
    referrerFirstName: string;
    referrerLastName: string;
    referrerEmail: string;
    referrerPhone: string | null;
    examineeEmail: string | null;
    examineePhone: string | null;
    locationType: "telehealth" | "in_person";
    intakeAnswers: { fieldId: number; name: string; value: string }[];
    createdAt: string;
  } | null;
}

const LOCATION_LABEL = { telehealth: "Telehealth", in_person: "Face to face" } as const;

export function examineeName(data: CaseData): string {
  const { appointment: a } = data;
  return [a.examineeFirstName, a.examineeLastName].filter(Boolean).join(" ") || a.bookerName || "Unknown examinee";
}

// Shown in the booking's own timezone, like the Bookings list.
function format(iso: string, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: timezone, ...options }).format(new Date(iso));
}

export function BookingSummaryCard({ data }: { data: CaseData }) {
  const { appointment: a, details } = data;
  const time = { hour: "numeric", minute: "2-digit" } as const;
  return (
    <DetailCard title="Booking summary">
      <Row label="Examinee" value={examineeName(data)} />
      <Row label="Specialist" value={a.specialistName ?? a.calendarName} />
      <Row label="Date" value={format(a.startsAt, a.timezone, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <Row
        label="Time"
        value={`${format(a.startsAt, a.timezone, time)} – ${format(a.endsAt, a.timezone, { ...time, timeZoneName: "short" })}`}
      />
      <Row label="Duration" value={`${a.durationMinutes} min`} />
      <Row label="Appointment type" value={details ? LOCATION_LABEL[details.locationType] : null} />
      <Row label="Service" value={a.type} />
      <Row label="Status" value={a.canceled ? "Canceled" : "Booked"} />
      <Row label="Acuity ID" value={String(a.acuityId)} />
    </DetailCard>
  );
}

export function ExamineeCard({ data }: { data: CaseData }) {
  return (
    <DetailCard title="Examinee">
      <Row label="Name" value={examineeName(data)} />
      <Row label="Email" value={data.details?.examineeEmail} />
      <Row label="Phone" value={data.details?.examineePhone} />
    </DetailCard>
  );
}

export function ReferrerCard({ data }: { data: CaseData }) {
  const { appointment: a, details } = data;
  // Synced-only bookings: fall back to who booked in Acuity.
  const name = details
    ? `${details.referrerFirstName} ${details.referrerLastName}`
    : a.referrerName ?? a.bookerName;
  return (
    <DetailCard title="Referrer">
      <Row label="Name" value={name} />
      <Row label="Email" value={details?.referrerEmail ?? a.bookerEmail} />
      <Row label="Phone" value={details?.referrerPhone} />
      <Row label="Organisation" value={details?.organizationName} />
    </DetailCard>
  );
}

export function IntakeAnswersCard({ data }: { data: CaseData }) {
  const answers = data.details?.intakeAnswers ?? [];
  return (
    <DetailCard title="Intake form">
      {answers.length === 0 ? (
        <p className="text-muted-foreground">No intake answers recorded.</p>
      ) : (
        answers.map((answer) => <Row key={answer.fieldId} label={answer.name} value={answer.value} />)
      )}
    </DetailCard>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || "—"}</dd>
    </div>
  );
}
