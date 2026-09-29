"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";

// Specialists only: pulls the latest bookings for their own calendar.
export function RefreshMyBookingsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setResult(null);
    const res = await clientFetch("/api/appointments/refresh", { method: "POST" });
    setBusy(false);

    const data = (await res.json().catch(() => ({}))) as { synced?: number; error?: string };
    if (!res.ok) {
      setResult(data.error ?? "Refresh failed.");
      return;
    }
    setResult(`Up to date · ${data.synced} ${data.synced === 1 ? "booking" : "bookings"} checked`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-muted-foreground text-sm">{result}</span>}
      <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Refreshing…" : "Refresh my bookings"}
      </Button>
    </div>
  );
}
