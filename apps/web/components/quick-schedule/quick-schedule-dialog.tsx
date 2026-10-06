"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";

import { clientFetch } from "@/lib/api-client";
import { useApiQuery } from "@/lib/use-api-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { FieldError } from "@workspace/ui/components/field";

import { StepDateTime } from "./step-date-time";
import { StepDetails } from "./step-details";
import { StepService } from "./step-service";
import { StepSpecialist } from "./step-specialist";
import { LOCATION_LABEL, type IntakeForm } from "./types";
import { STEPS, useQuickSchedule } from "./use-quick-schedule";

const DESCRIPTIONS = [
  "Who is the appointment with?",
  "Telehealth or face to face?",
  "Pick a day, then a time.",
  "Who is referring, and the examinee's intake form.",
];

/** Admin-only "Quick schedule" button + 4-step booking wizard. */
export function QuickScheduleDialog() {
  const router = useRouter();
  const wizard = useQuickSchedule();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const forms = useApiQuery<IntakeForm[]>(
    wizard.service ? `/api/booking/intake-forms?appointmentTypeId=${wizard.service.id}` : null,
  );
  const loadedForms = forms.data ?? [];
  const blocker = wizard.blocker(loadedForms);
  const isLastStep = wizard.step === STEPS.length - 1;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      wizard.reset();
      setError(null);
      setCreatedId(null);
    }
  }

  async function submit() {
    const { specialist, service, datetime, timezone, details, answers } = wizard;
    if (!specialist || !service || !datetime) return;

    setPending(true);
    setError(null);
    const res = await clientFetch("/api/booking/appointments", {
      method: "POST",
      body: JSON.stringify({
        calendarId: specialist.calendarId,
        appointmentTypeId: service.id,
        datetime,
        timezone,
        organizationId: details.organizationId,
        referrerUserId: details.referrerUserId || undefined,
        referrer: {
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          phone: details.phone,
        },
        answers: Object.entries(answers)
          .filter(([, value]) => value.trim() !== "")
          .map(([fieldId, value]) => ({ fieldId: Number(fieldId), value })),
      }),
    }).catch(() => null);
    setPending(false);

    const body = (await res?.json().catch(() => null)) as { id?: string; error?: string } | null;
    if (!res?.ok || !body?.id) {
      setError(body?.error ?? "Could not create the booking.");
      return;
    }
    setCreatedId(body.id);
    router.refresh(); // show the new case in Bookings
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} data-icon="inline-start" />
            Quick schedule
          </Button>
        }
      />
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {createdId ? (
          <Success
            id={createdId}
            summary={summary(wizard)}
            onDone={() => handleOpenChange(false)}
            onAnother={() => {
              wizard.reset();
              setCreatedId(null);
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Quick schedule · {STEPS[wizard.step]}</DialogTitle>
              <DialogDescription>{DESCRIPTIONS[wizard.step]}</DialogDescription>
              <StepIndicator current={wizard.step} />
              {wizard.step > 0 && <p className="text-muted-foreground text-xs">{summary(wizard)}</p>}
            </DialogHeader>

            {wizard.step === 0 && (
              <StepSpecialist selected={wizard.specialist} onSelect={wizard.selectSpecialist} />
            )}
            {wizard.step === 1 && wizard.specialist && (
              <StepService
                specialist={wizard.specialist}
                selected={wizard.service}
                onSelect={wizard.selectService}
              />
            )}
            {wizard.step === 2 && wizard.specialist && wizard.service && (
              <StepDateTime
                specialist={wizard.specialist}
                service={wizard.service}
                timezone={wizard.timezone}
                onTimezoneChange={wizard.changeTimezone}
                datetime={wizard.datetime}
                onSelect={wizard.setDatetime}
              />
            )}
            {wizard.step === 3 && (
              <StepDetails
                forms={loadedForms}
                formsLoading={forms.loading}
                details={wizard.details}
                onDetailsChange={wizard.setDetails}
                answers={wizard.answers}
                onAnswer={wizard.setAnswer}
              />
            )}

            {(error ?? forms.error) && <FieldError>{error ?? forms.error}</FieldError>}

            <DialogFooter className="items-center sm:justify-between">
              <Button variant="outline" disabled={wizard.step === 0 || pending} onClick={wizard.back}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {blocker && <span className="text-muted-foreground text-xs">{blocker}</span>}
                {isLastStep ? (
                  <Button disabled={!!blocker || pending || forms.loading} onClick={submit}>
                    {pending ? "Booking…" : "Book appointment"}
                  </Button>
                ) : (
                  <Button disabled={!!blocker} onClick={wizard.next}>
                    Next
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function summary(wizard: ReturnType<typeof useQuickSchedule>): string {
  const parts = [wizard.specialist?.specialistName];
  if (wizard.service) parts.push(LOCATION_LABEL[wizard.service.locationType]);
  if (wizard.datetime) {
    parts.push(
      new Intl.DateTimeFormat("en-AU", {
        timeZone: wizard.timezone,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(wizard.datetime)),
    );
  }
  return parts.filter(Boolean).join(" · ");
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex gap-1.5 pt-1" aria-label={`Step ${current + 1} of ${STEPS.length}`}>
      {STEPS.map((step, index) => (
        <span
          key={step}
          className={cn("h-1 flex-1 rounded-full", index <= current ? "bg-primary" : "bg-muted")}
        />
      ))}
    </div>
  );
}

function Success({
  id,
  summary,
  onDone,
  onAnother,
}: {
  id: string;
  summary: string;
  onDone: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="text-primary size-10" />
      <DialogTitle>Booking created</DialogTitle>
      <DialogDescription>{summary}</DialogDescription>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onAnother}>
          Book another
        </Button>
        <Button nativeButton={false} render={<Link href={`/bookings/${id}`} onClick={onDone} />}>
          View case
        </Button>
      </div>
    </div>
  );
}
