"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api-client";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

export interface OrganizationOption {
  id: string;
  name: string;
}

const selectClass =
  "border-input bg-transparent text-foreground h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none";

export function CreateUserDialog({
  organizations,
}: {
  organizations: OrganizationOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"referrer" | "specialist">("referrer");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const organizationId = String(form.get("organizationId") ?? "");

    if (role === "referrer" && !organizationId) {
      setError("A referrer must belong to an organization");
      return;
    }

    setPending(true);
    const res = await clientFetch("/api/users", {
      method: "POST",
      body: JSON.stringify({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        phone: String(form.get("phone") ?? "") || undefined,
        role,
        // Only referrers carry an organization; the API rejects it on a specialist.
        ...(role === "referrer" ? { organizationId } : {}),
      }),
    });
    setPending(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not create that user.");
      return;
    }

    setOpen(false);
    setRole("referrer");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add user</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            They receive an email invitation to set their own password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input id="firstName" name="firstName" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input id="lastName" name="lastName" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone (optional)</FieldLabel>
              <Input id="phone" name="phone" />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <select
                id="role"
                name="role"
                className={selectClass}
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "referrer" | "specialist")
                }
              >
                <option value="referrer">Referrer</option>
                <option value="specialist">Specialist</option>
              </select>
            </Field>

            {role === "referrer" && (
              <Field>
                <FieldLabel htmlFor="organizationId">Organization</FieldLabel>
                <select
                  id="organizationId"
                  name="organizationId"
                  className={selectClass}
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select an organization
                  </option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create and invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
