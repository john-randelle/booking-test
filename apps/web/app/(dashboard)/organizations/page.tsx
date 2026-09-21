import Link from "next/link";
import { redirect } from "next/navigation";

import { apiFetch, getSessionUser } from "@/lib/session";
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/");

  const res = await apiFetch("/api/organizations");
  if (!res.ok) {
    throw new Error(`Failed to load organizations: ${res.status}`);
  }

  const organizations: Organization[] = await res.json();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Organizations</h1>
          <p className="text-muted-foreground text-sm">
            {organizations.length}{" "}
            {organizations.length === 1 ? "organization" : "organizations"}
          </p>
        </div>
        <CreateOrganizationDialog />
      </div>

      {organizations.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No organizations yet. Create one before adding referrers.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/organizations/${organization.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {organization.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {organization.slug}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
