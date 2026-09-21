"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string | null;
  banned: boolean | null;
  organizationId: string | null;
  organizationName: string | null;
  invited: boolean;
}

function statusOf(user: UserRow) {
  if (user.banned) return "Deactivated";
  return user.invited ? "Invited" : "Active";
}

export function UserTable({
  users,
  showOrganization = true,
}: {
  users: UserRow[];
  showOrganization?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, path: string, method: "POST" | "PATCH", body?: unknown) {
    setBusyId(id);
    setError(null);
    const res = await clientFetch(path, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    setBusyId(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "That action failed.");
      return;
    }
    router.refresh();
  }

  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">No users yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {showOrganization && <TableHead>Organization</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const status = statusOf(user);
            const busy = busyId === user.id;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>{user.role ?? "—"}</TableCell>
                {showOrganization && (
                  <TableCell className="text-muted-foreground">
                    {user.organizationName ?? "—"}
                  </TableCell>
                )}
                <TableCell>{status}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {user.invited && !user.banned && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act(user.id, `/api/users/${user.id}/resend-invitation`, "POST")
                        }
                      >
                        Resend invite
                      </Button>
                    )}
                    {user.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act(user.id, `/api/users/${user.id}/role`, "PATCH", {
                            role: user.role === "referrer" ? "specialist" : "referrer",
                          })
                        }
                      >
                        Make {user.role === "referrer" ? "specialist" : "referrer"}
                      </Button>
                    )}
                    {user.role !== "admin" &&
                      (user.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => act(user.id, `/api/users/${user.id}/unban`, "POST")}
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`Deactivate ${user.email}?`)) return;
                            void act(user.id, `/api/users/${user.id}/ban`, "POST");
                          }}
                        >
                          Deactivate
                        </Button>
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
