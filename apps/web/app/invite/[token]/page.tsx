"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { clientFetch } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

const MIN_PASSWORD_LENGTH = 12;

interface Invitee {
  email: string;
  firstName: string | null;
}

export default function Page() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    clientFetch("/api/invite/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = (await res.json()) as Invitee & { error?: string };
        if (!active) return;
        if (res.ok) setInvitee(data);
        else setLoadError(data.error ?? "This invitation is not valid.");
      })
      .catch(() => {
        if (active) setLoadError("Could not reach the server.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirmPassword"));

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setPending(true);
    const res = await clientFetch("/api/invite/accept", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    setPending(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not set your password.");
      return;
    }

    // Full navigation, so the session cookie from the response is picked up.
    window.location.href = "/";
  }

  if (loadError) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              {invitee?.firstName
                ? `Welcome, ${invitee.firstName}`
                : "Set your password"}
            </CardTitle>
            <CardDescription>
              {invitee
                ? `Choose a password for ${invitee.email}.`
                : "Checking your invitation…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    disabled={!invitee}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    disabled={!invitee}
                  />
                </Field>
                {error && <FieldError>{error}</FieldError>}
                <Field>
                  <Button type="submit" disabled={pending || !invitee}>
                    {pending ? "Setting password…" : "Set password and continue"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

