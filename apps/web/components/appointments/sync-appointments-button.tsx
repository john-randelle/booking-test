"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clientFetch } from "@/lib/api-client";
import { Button } from "@workspace/ui/components/button";

export function SyncAppointmentsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setResult(null);
    const res = await clientFetch("/api/appointments/sync", { method: "POST" });
    setBusy(false);

    const data = (await res.json().catch(() => ({}))) as {
      synced?: number;
      attributed?: number;
      error?: string;
    };
    if (!res.ok) {
      setResult(data.error ?? "Sync failed.");
      return;
    }
    setResult(`Synced ${data.synced} bookings, ${data.attributed} with a referrer`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-muted-foreground text-sm">{result}</span>}
      <Button variant="outline" disabled={busy} onClick={() => void sync()}>
        {busy ? "Syncing…" : "Sync bookings"}
      </Button>
    </div>
  );
}
