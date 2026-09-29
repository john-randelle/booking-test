import type { AppointmentService } from "../services/appointment-service.js";

/**
 * Periodically re-syncs the rolling window as a safety net for missed
 * webhooks. Runs never overlap. Returns a function that stops the job.
 */
export function startAppointmentSyncJob(
  service: Pick<AppointmentService, "syncRecent">,
  intervalMinutes: number,
): () => void {
  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const result = await service.syncRecent();
      console.info(`[appointment-sync] synced ${result.synced}, attributed ${result.attributed}`);
    } catch (error) {
      console.error("[appointment-sync] failed:", error);
    } finally {
      running = false;
    }
  }, intervalMinutes * 60_000);

  timer.unref();
  return () => clearInterval(timer);
}
