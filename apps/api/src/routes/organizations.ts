import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import {
  ConflictError, ValidationError, type OrganizationService,
} from "../services/organization-service.js";

export function createOrganizationRoutes(service: OrganizationService) {
  return new Hono<AppEnv>()
    .get("/", requirePermission("user", "list"), async (c) => {
      return c.json(await service.list());
    })
    .post("/", requirePermission("user", "create"), async (c) => {
      const body = await c.req.json<{ name?: string; slug?: string }>();
      if (!body.name || !body.slug) {
        return c.json({ error: "name and slug are required" }, 400);
      }
      try {
        return c.json(await service.create({ name: body.name, slug: body.slug }), 201);
      } catch (error) {
        const status = error instanceof ConflictError ? 409
          : error instanceof ValidationError ? 400 : 500;
        const msg = error instanceof Error ? error.message : "Unexpected error";
        return c.json({ error: msg }, status);
      }
    });
}