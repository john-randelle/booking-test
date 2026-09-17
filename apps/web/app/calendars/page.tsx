import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

interface Calendar {
  id: string
  acuityId: number
  name: string
  email: string | null
  replyTo: string | null
  description: string | null
  location: string | null
  timezone: string
  isValid: boolean
  syncedAt: string
}

export default async function Page() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calendars`)

  if (!res.ok) {
    throw new Error(`Failed to load calendars: ${res.status}`)
  }

  const calendars: Calendar[] = await res.json()

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Calendars</h1>
          <p className="text-muted-foreground text-sm">
            {calendars.length} synced from Acuity
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          Back to dashboard
        </Button>
      </div>

      {calendars.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No calendars yet. Run{" "}
          <code className="bg-muted rounded px-1 py-0.5">
            curl -X POST {process.env.NEXT_PUBLIC_API_URL}/api/calendars/sync
          </code>{" "}
          to pull them from Acuity.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Acuity ID</TableHead>
              <TableHead>Last synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calendars.map((calendar) => (
              <TableRow key={calendar.id}>
                <TableCell className="font-medium">{calendar.name}</TableCell>
                <TableCell>{calendar.timezone}</TableCell>
                <TableCell className="text-muted-foreground">
                  {calendar.email ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {calendar.acuityId}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(calendar.syncedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}