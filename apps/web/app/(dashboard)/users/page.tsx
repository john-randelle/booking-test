import { redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import {
  CreateUserDialog,
  type OrganizationOption,
} from "@/components/users/create-user-dialog";
import { UserTable, type UserRow } from "@/components/users/user-table";

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/");

  const [usersRes, orgsRes] = await Promise.all([
    apiFetch("/api/users"),
    apiFetch("/api/organizations"),
  ]);

  if (!usersRes.ok) {
    throw new Error(`Failed to load users: ${usersRes.status}`);
  }

  const users: UserRow[] = await usersRes.json();
  const organizations: OrganizationOption[] = orgsRes.ok ? await orgsRes.json() : [];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Users</h1>
          <p className="text-muted-foreground text-sm">
            {users.length} {users.length === 1 ? "person" : "people"}
          </p>
        </div>
        <CreateUserDialog organizations={organizations} />
      </div>

      <UserTable users={users} />
    </div>
  );
}
