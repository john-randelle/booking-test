"use client";

import { useState } from "react";

import type { IntakeForm, ReferrerDetails, Service, Specialist } from "./types";

export const STEPS = ["Specialist", "Service", "Date & time", "Booking details"] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_DETAILS: ReferrerDetails = {
  organizationId: "",
  referrerUserId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Wizard state for Quick schedule. Changing an earlier choice clears the later ones. */
export function useQuickSchedule() {
  const [step, setStep] = useState(0);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [timezone, setTimezone] = useState(browserTimezone);
  const [datetime, setDatetime] = useState<string | null>(null);
  const [details, setDetails] = useState<ReferrerDetails>(EMPTY_DETAILS);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  function selectSpecialist(next: Specialist) {
    if (next.calendarId === specialist?.calendarId) return;
    setSpecialist(next);
    setService(null);
    setDatetime(null);
    setAnswers({});
  }

  function selectService(next: Service) {
    if (next.id === service?.id) return;
    setService(next);
    setDatetime(null);
    setAnswers({}); // telehealth and face-to-face use different intake forms
  }

  function changeTimezone(next: string) {
    setTimezone(next);
    setDatetime(null); // slots are listed per timezone
  }

  function setAnswer(fieldId: number, value: string) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  /** Why the current step can't continue yet, or null when it can. */
  function blocker(forms: IntakeForm[]): string | null {
    switch (step) {
      case 0:
        return specialist ? null : "Choose a specialist";
      case 1:
        return service ? null : "Choose a service";
      case 2:
        return datetime ? null : "Choose a date and time";
      case 3:
        return detailsBlocker(details, forms, answers);
      default:
        return null;
    }
  }

  function reset() {
    setStep(0);
    setSpecialist(null);
    setService(null);
    setTimezone(browserTimezone());
    setDatetime(null);
    setDetails(EMPTY_DETAILS);
    setAnswers({});
  }

  return {
    step,
    next: () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
    back: () => setStep((s) => Math.max(s - 1, 0)),
    specialist,
    selectSpecialist,
    service,
    selectService,
    timezone,
    changeTimezone,
    datetime,
    setDatetime,
    details,
    setDetails,
    answers,
    setAnswer,
    blocker,
    reset,
  };
}

function detailsBlocker(
  details: ReferrerDetails,
  forms: IntakeForm[],
  answers: Record<number, string>,
): string | null {
  if (!details.organizationId) return "Choose an organisation";
  if (!details.firstName.trim() || !details.lastName.trim()) return "Enter the referrer's name";
  if (!EMAIL.test(details.email.trim())) return "Enter a valid referrer email";
  if (!details.phone.trim()) return "Enter the referrer's phone";

  for (const field of forms.flatMap((f) => f.fields)) {
    if (field.required && field.type !== "file" && !answers[field.id]?.trim()) {
      return `"${field.name}" is required`;
    }
  }
  return null;
}
