import { Hono } from "hono";
import type { AppEnv } from "../middleware/session.js";
import type { AppointmentService } from "../services/appointment-service.js";

type SignatureCheck = (rawBody: string, signature: string | undefined) => boolean;

// POST /api/webhooks/acuity — body is form-encoded:
// action=appointment.scheduled&id=123&calendarID=4&appointmentTypeID=5
export function createAcuityWebhookRoutes(
  service: Pick<AppointmentService, "syncOne">,
  isValidSignature: SignatureCheck,
) {
  return new Hono<AppEnv>().post("/", async (c) => {
    const rawBody = await c.req.text();
    if (!isValidSignature(rawBody, c.req.header("x-acuity-signature"))) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    const params = new URLSearchParams(rawBody);
    const action = params.get("action") ?? "";
    const id = Number(params.get("id"));
    if (!action.startsWith("appointment.") || !Number.isInteger(id) || id <= 0) {
      return c.json({ ok: true, ignored: true });
    }

    try {
      // Always re-read from Acuity rather than trusting the payload, so
      // duplicate or out-of-order deliveries still store the latest state.
      await service.syncOne(id);
      return c.json({ ok: true });
    } catch (error) {
      console.error(`[webhooks] ${action} for appointment ${id} failed:`, error);
      return c.json({ error: "Sync failed" }, 500);
    }
  });
}
