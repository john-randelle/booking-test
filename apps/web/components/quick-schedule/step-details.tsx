"use client";

import { useApiQuery } from "@/lib/use-api-query";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import { IntakeFieldInput, selectClass } from "./intake-field-input";
import { StepMessage } from "./option-card";
import type { IntakeForm, OrganizationOption, ReferrerDetails, ReferrerOption } from "./types";

export function StepDetails({
  forms,
  formsLoading,
  details,
  onDetailsChange,
  answers,
  onAnswer,
}: {
  forms: IntakeForm[];
  formsLoading: boolean;
  details: ReferrerDetails;
  onDetailsChange: (details: ReferrerDetails) => void;
  answers: Record<number, string>;
  onAnswer: (fieldId: number, value: string) => void;
}) {
  const organizations = useApiQuery<OrganizationOption[]>("/api/organizations");
  const users = useApiQuery<ReferrerOption[]>("/api/users");
  const referrers = (users.data ?? []).filter((u) => u.role === "referrer");

  function update(patch: Partial<ReferrerDetails>) {
    onDetailsChange({ ...details, ...patch });
  }

  // Picking an existing referrer fills in their details and organisation.
  function pickReferrer(id: string) {
    const referrer = referrers.find((r) => r.id === id);
    if (!referrer) return update({ referrerUserId: "" });
    update({
      referrerUserId: referrer.id,
      firstName: referrer.firstName ?? "",
      lastName: referrer.lastName ?? "",
      email: referrer.email,
      phone: referrer.phone ?? "",
      organizationId: referrer.organizationId ?? details.organizationId,
    });
  }

  return (
    <FieldGroup>
      <p className="text-muted-foreground text-xs font-medium">Organisation</p>
      <Field>
        <FieldLabel htmlFor="qs-org">
          Organisation <span className="text-destructive">*</span>
        </FieldLabel>
        <select
          id="qs-org"
          className={selectClass}
          value={details.organizationId}
          onChange={(e) => update({ organizationId: e.target.value })}
        >
          <option value="">{organizations.loading ? "Loading…" : "Select an organisation"}</option>
          {organizations.data?.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </Field>

      <FieldSeparator />
      <p className="text-muted-foreground text-xs font-medium">Referrer</p>
      <Field>
        <FieldLabel htmlFor="qs-referrer-user">Existing referrer (optional)</FieldLabel>
        <select
          id="qs-referrer-user"
          className={selectClass}
          value={details.referrerUserId}
          onChange={(e) => pickReferrer(e.target.value)}
        >
          <option value="">{users.loading ? "Loading…" : "None – enter details below"}</option>
          {referrers.map((r) => (
            <option key={r.id} value={r.id}>
              {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email} · {r.email}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <TextField id="qs-ref-first" label="First name" value={details.firstName} onChange={(firstName) => update({ firstName })} />
        <TextField id="qs-ref-last" label="Last name" value={details.lastName} onChange={(lastName) => update({ lastName })} />
      </div>
      <TextField id="qs-ref-email" label="Email" type="email" value={details.email} onChange={(email) => update({ email })} />
      <TextField id="qs-ref-phone" label="Phone" type="tel" value={details.phone} onChange={(phone) => update({ phone })} />

      {formsLoading && <StepMessage>Loading intake form…</StepMessage>}
      {forms.map((form) => (
        <div key={form.id} className="flex flex-col gap-4">
          <FieldSeparator />
          <div>
            <h3 className="text-sm font-semibold">{form.name}</h3>
            {form.description && <p className="text-muted-foreground mt-0.5 text-xs">{form.description}</p>}
          </div>
          {form.fields.map((field) => (
            <IntakeFieldInput
              key={field.id}
              field={field}
              value={answers[field.id] ?? ""}
              onChange={(value) => onAnswer(field.id, value)}
            />
          ))}
        </div>
      ))}
    </FieldGroup>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label} <span className="text-destructive">*</span>
      </FieldLabel>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
