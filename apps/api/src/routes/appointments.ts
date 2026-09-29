import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import {
  RateLimitError, ValidationError, type AppointmentService,
} from "../services/appointment-service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function createAppointmentRoutes(service: AppointmentService) {
  return new Hono<AppEnv>()
    // GET /api/appointments?from=ISO&to=ISO&includeCanceled=true
    // Defaults to the next 30 days. Results are scoped to the caller's role.
    .get("/", requirePermission("appointment", "read"), async (c) => {
      const { user } = c.get("session")!;
      const from = c.req.query("from") ? new Date(c.req.query("from")!) : new Date();
      const to = c.req.query("to")
        ? new Date(c.req.query("to")!)
        : new Date(from.getTime() + 30 * DAY_MS);

      try {
        return c.json(
          await service.listFor(
            { id: user.id, role: user.role ?? null },
            { from, to, includeCanceled: c.req.query("includeCanceled") === "true" },
          ),
        );
      } catch (error) {
        return c.json({ error: message(error) }, error instanceof ValidationError ? 400 : 500);
      }
    })
    .post("/sync", requirePermission("appointment", "sync"), async (c) => {
      try {
        return c.json(await service.syncRecent());
      } catch (error) {
        console.error("[appointments] sync failed:", error);
        return c.json({ error: message(error) }, 502);
      }
    })
    // Syncs only the caller's own calendar (specialists).
    .post("/refresh", requirePermission("appointment", "refresh"), async (c) => {
      const { user } = c.get("session")!;
      try {
        return c.json(await service.refreshForSpecialist(user.id));
      } catch (error) {
        if (error instanceof RateLimitError) {
          c.header("Retry-After", String(error.retryAfterSeconds));
          return c.json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds }, 429);
        }
        if (error instanceof ValidationError) return c.json({ error: error.message }, 400);
        console.error("[appointments] refresh failed:", error);
        return c.json({ error: message(error) }, 502);
      }
    });
}
