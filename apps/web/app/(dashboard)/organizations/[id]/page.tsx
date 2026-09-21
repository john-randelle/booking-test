import Link from "next/link";
import { redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import { UserTable, type UserRow } from "@/components/users/user-table";
import { Button } from "@workspace/ui/components/button";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/");

  const { id } = await params;

  const [orgsRes, usersRes] = await Promise.all([
    apiFetch("/api/organizations"),
    apiFetch(`/api/users?organizationId=${encodeURIComponent(id)}`),
  ]);

  if (!usersRes.ok) {
    throw new Error(`Failed to load members: ${usersRes.status}`);
  }

  const organizations: Organization[] = orgsRes.ok ? await orgsRes.json() : [];
  const organization = organizations.find((candidate) => candidate.id === id);
  const members: UserRow[] = await usersRes.json();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">{organization?.name ?? "Organization"}</h1>
          <p className="text-muted-foreground text-sm">
            {organization?.slug ? `${organization.slug} · ` : ""}
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/organizations" />}
        >
          Back to organizations
        </Button>
      </div>

      <UserTable users={members} showOrganization={false} />
    </div>
  );
}
