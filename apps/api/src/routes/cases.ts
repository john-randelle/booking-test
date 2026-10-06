import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import { NotFoundError, type CaseService } from "../services/case-service.js";

export function createCaseRoutes(service: CaseService) {
  return new Hono<AppEnv>()
    // GET /api/cases/:id – CaseService limits which cases each role may open.
    .get("/:id", requirePermission("appointment", "read"), async (c) => {
      const { user } = c.get("session")!;
      try {
        return c.json(await service.get({ id: user.id, role: user.role ?? null }, c.req.param("id")));
      } catch (error) {
        if (error instanceof NotFoundError) return c.json({ error: error.message }, 404);
        console.error("[cases] failed:", error);
        return c.json({ error: "Unexpected error" }, 500);
      }
    });
}
