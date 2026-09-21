import { Hono } from "hono";
import { requirePermission } from "../middleware/require-permission.js";
import type { AppEnv } from "../middleware/session.js";
import { ConflictError, ValidationError, NotFoundError, type UserService,} from "../services/user-service.js";
import type { UserRole } from "../ports/user-repo.js";

function statusFor(error: unknown): 400 | 404 | 409 | 500 {
  if (error instanceof ConflictError) return 409;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ValidationError) return 400;
  return 500;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

interface CreateBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  organizationId?: string;
}

export function createUserRoutes(service: UserService) {
  return new Hono<AppEnv>()
    .get("/", requirePermission("user", "list"), async (c) => {
  const organizationId = c.req.query("organizationId");
  return c.json(await service.list(organizationId ? { organizationId } : undefined));
  })
    .post("/", requirePermission("user", "create"), async (c) => {
      const body = await c.req.json<CreateBody>();
      if (!body.firstName || !body.lastName || !body.email || !body.role) {
        return c.json({ error: "firstName, lastName, email and role are required" }, 400);
      }
      try {
        const created = await service.create({
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          role: body.role,
          organizationId: body.organizationId,
        });
        return c.json(created, 201);
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    })
    .patch("/:id/role", requirePermission("user", "set-role"), async (c) => {
      const body = await c.req.json<{ role?: UserRole }>();
      if (!body.role) return c.json({ error: "role is required" }, 400);
      try {
        await service.setRole(c.req.param("id"), body.role);
        return c.json({ ok: true });
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    })
    .post("/:id/ban", requirePermission("user", "ban"), async (c) => {
      try {
        await service.setBanned(c.req.param("id"), true);
        return c.json({ ok: true });
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    })
    .post("/:id/unban", requirePermission("user", "ban"), async (c) => {
      try {
        await service.setBanned(c.req.param("id"), false);
        return c.json({ ok: true });
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    })

     .post("/:id/resend-invitation", requirePermission("user", "create"), async (c) => {
      try {
        await service.resendInvitation(c.req.param("id"));
        return c.json({ ok: true });
      } catch (error) {
        return c.json({ error: message(error) }, statusFor(error));
      }
    });
    
}