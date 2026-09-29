import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import {
  ConflictError, ValidationError, NotFoundError, type CalendarService,
} from "../services/calendar-service.js";

function statusFor(error: unknown): 400 | 404 | 409 | 500 {
  if (error instanceof ConflictError) return 409;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ValidationError) return 400;
  return 500;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export function createCalendarRoutes(service: CalendarService) {
  return new Hono<AppEnv>()
    .get("/", requirePermission("calendar", "read"), async (c) => {
      return c.json(await service.list());
    })
    .post("/sync", requirePermission("calendar", "sync"), async (c) => {
      return c.json(await service.sync());
    })
    .patch("/:id/specialist", requirePermission("calendar", "assign"), async (c) => {
      const body = await c.req.json<{ specialistId?: string | null }>();
      const { specialistId } = body;

      if (specialistId !== null && typeof specialistId !== "string") {
        return c.json({ error: "specialistId must be a user id, or null to unlink" }, 400);
      }
      try {
        await service.assignSpecialist(c.req.param("id"), specialistId);
        return c.json({ ok: true });
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    });
}