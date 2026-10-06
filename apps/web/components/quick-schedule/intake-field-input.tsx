"use client";

import { Field, FieldDescription, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import type { IntakeField } from "./types";

export const selectClass =
  "border-input bg-transparent text-foreground h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none";
const textareaClass =
  "border-input bg-transparent text-foreground min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none";

/** One Acuity intake field, rendered by its Acuity type. Values are plain strings. */
export function IntakeFieldInput({
  field,
  value,
  onChange,
}: {
  field: IntakeField;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `qs-field-${field.id}`;

  if (field.type === "checkbox") {
    return (
      <Field orientation="horizontal">
        <input
          id={id}
          type="checkbox"
          checked={value === "yes"}
          onChange={(e) => onChange(e.target.checked ? "yes" : "")}
        />
        <FieldLabel htmlFor={id}>
          {field.name}
          {field.required && <Required />}
        </FieldLabel>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {field.name}
        {field.required && <Required />}
      </FieldLabel>
      {control(field, id, value, onChange)}
    </Field>
  );
}

function control(field: IntakeField, id: string, value: string, onChange: (value: string) => void) {
  switch (field.type) {
    case "textarea":
    case "address":
      return <textarea id={id} className={textareaClass} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "yesno":
      return (
        <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
    case "dropdown":
      return (
        <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    case "checkboxlist":
      return <CheckboxList id={id} options={field.options} value={value} onChange={onChange} />;
    case "file":
      return <FieldDescription>File uploads aren&apos;t supported here; add it in Acuity after booking.</FieldDescription>;
    default:
      return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

// Acuity stores a checkbox list as a comma-separated string.
function CheckboxList({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const checked = new Set(value ? value.split(", ") : []);
  function toggle(option: string) {
    const next = new Set(checked);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    onChange(options.filter((o) => next.has(o)).join(", "));
  }
  return (
    <div id={id} className="flex flex-col gap-1">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checked.has(option)} onChange={() => toggle(option)} />
          {option}
        </label>
      ))}
    </div>
  );
}

function Required() {
  return <span className="text-destructive"> *</span>;
}
