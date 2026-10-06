import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "@/components/sign-out-button";
import { QuickScheduleDialog } from "@/components/quick-schedule/quick-schedule-dialog";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-6 border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/">Dashboard</Link>
          <Link href="/calendars">Specialists</Link>
          {isAdmin && <Link href="/users">Users</Link>}
          {isAdmin && <Link href="/organizations">Organizations</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {/* Quick schedule is admin-only; the API enforces this too (booking:create). */}
          {isAdmin && <QuickScheduleDialog />}
          <span className="text-muted-foreground">
            {user.firstName ?? user.name} · {user.role}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}