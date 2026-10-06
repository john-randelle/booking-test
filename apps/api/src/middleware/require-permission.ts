import { createMiddleware } from "hono/factory";
import { adminRole, referrerRole, specialistRole } from "../lib/roles.js";
import type { AppEnv } from "./session.js";

const ROLES = {
  admin: adminRole,
  referrer: referrerRole,
  specialist: specialistRole,
} as const;

type Resource = "user" | "calendar" | "appointment" | "booking";

export function requirePermission(resource: Resource, action: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = c.get("session");
    if (!session) return c.json({ error: "UNAUTHORIZED" }, 401);

    const roleName = session.user.role ?? "";
    const role = ROLES[roleName as keyof typeof ROLES];
    if (!role) return c.json({ error: "FORBIDDEN" }, 403);

    const result = role.authorize({ [resource]: [action] } as never);
    if (!result.success) return c.json({ error: "FORBIDDEN" }, 403);

    await next();
  });
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("session")) return c.json({ error: "UNAUTHORIZED" }, 401);
  await next();
});