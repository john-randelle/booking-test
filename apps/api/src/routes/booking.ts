import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import {
  NotFoundError, ValidationError, type BookingService, type QuickBookingInput,
} from "../services/booking-service.js";

function statusFor(error: unknown): 400 | 404 | 500 {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ValidationError) return 400;
  return 500;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

// Reads the availability query shared by /availability/dates and /availability/times.
function availabilityParams(query: (name: string) => string | undefined) {
  return {
    calendarId: query("calendarId") ?? "",
    appointmentTypeId: Number(query("appointmentTypeId")),
    timezone: query("timezone") ?? "",
  };
}

// Quick schedule. Every route (lookups included) is admin-only via booking:create.
export function createBookingRoutes(service: BookingService) {
  return new Hono<AppEnv>()
    .use("*", requirePermission("booking", "create"))
    .onError((error, c) => {
      const status = statusFor(error);
      if (status === 500) console.error("[booking]", error);
      return c.json({ error: message(error) }, status);
    })
    .get("/specialists", async (c) => c.json(await service.listSpecialists()))
    // GET /api/booking/services?calendarId=
    .get("/services", async (c) => {
      return c.json(await service.listServices(c.req.query("calendarId") ?? ""));
    })
    // GET /api/booking/intake-forms?appointmentTypeId=
    .get("/intake-forms", async (c) => {
      return c.json(await service.listIntakeForms(Number(c.req.query("appointmentTypeId"))));
    })
    // GET /api/booking/availability/dates?calendarId&appointmentTypeId&timezone&month=YYYY-MM
    .get("/availability/dates", async (c) => {
      return c.json(await service.availableDates({
        ...availabilityParams((name) => c.req.query(name)),
        month: c.req.query("month") ?? "",
      }));
    })
    // GET /api/booking/availability/times?calendarId&appointmentTypeId&timezone&date=YYYY-MM-DD
    .get("/availability/times", async (c) => {
      return c.json(await service.availableTimes({
        ...availabilityParams((name) => c.req.query(name)),
        date: c.req.query("date") ?? "",
      }));
    })
    .post("/appointments", async (c) => {
      const body = await c.req.json<Partial<QuickBookingInput>>().catch(() => null);
      if (!body) return c.json({ error: "Invalid JSON body" }, 400);

      const { user } = c.get("session")!;
      const id = await service.book(
        {
          calendarId: body.calendarId ?? "",
          appointmentTypeId: Number(body.appointmentTypeId),
          datetime: body.datetime ?? "",
          timezone: body.timezone ?? "",
          organizationId: body.organizationId ?? "",
          referrerUserId: body.referrerUserId || undefined,
          referrer: body.referrer ?? { firstName: "", lastName: "", email: "", phone: "" },
          answers: Array.isArray(body.answers) ? body.answers : [],
        },
        user.id,
      );
      return c.json({ id }, 201);
    });
}
