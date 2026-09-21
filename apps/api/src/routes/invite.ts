import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { user, account } from "../schema/auth-schema.js";
import { auth } from "../lib/auth.js";
import { verifyInviteToken } from "../lib/invite-token.js";
import type { AppEnv } from "../middleware/session.js";

const MIN_PASSWORD_LENGTH = 12;

/** The credential account for a user, or null if there isn't one. */
async function credentialFor(userId: string) {
  const [row] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  return row ?? null;
}

export function createInviteRoutes() {
  return new Hono<AppEnv>()
    .post("/verify", async (c) => {
      const body = await c.req.json<{ token?: string }>();
      if (!body.token) return c.json({ error: "token is required" }, 400);

      let payload;
      try {
        payload = verifyInviteToken(body.token);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Invalid invite token";
        return c.json({ error: msg }, 400);
      }

      const credential = await credentialFor(payload.userId);
      if (!credential) {
        return c.json(
          { error: "This account no longer exists. Please contact your administrator." },
          404,
        );
      }
      if (credential.password !== null) {
        return c.json(
          { error: "This invite has already been accepted. You can sign in with your credentials." },
          409,
        );
      }

      const [found] = await db
        .select({ email: user.email, firstName: user.firstName, role: user.role })
        .from(user)
        .where(eq(user.id, payload.userId))
        .limit(1);
      if (!found) return c.json({ error: "This account no longer exists." }, 404);

      return c.json({ email: found.email, firstName: found.firstName, role: found.role });
    })
    .post("/accept", async (c) => {
      const body = await c.req.json<{ token?: string; password?: string }>();
      if (!body.token || !body.password) {
        return c.json({ error: "token and password are required" }, 400);
      }
      if (body.password.length < MIN_PASSWORD_LENGTH) {
        return c.json(
          { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
          400,
        );
      }

      let payload;
      try {
        payload = verifyInviteToken(body.token);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Invalid invite token";
        return c.json({ error: msg }, 400);
      }

      const credential = await credentialFor(payload.userId);
      if (!credential) return c.json({ error: "Account not found" }, 404);
      if (credential.password !== null) {
        return c.json({ error: "This invite has already been accepted." }, 409);
      }

      const ctx = await auth.$context;
      const hashed = await ctx.password.hash(body.password);

      await db.update(account).set({ password: hashed }).where(eq(account.id, credential.id));

      // asResponse carries the Set-Cookie header — return it straight through,
      // otherwise the password is set but the user stays logged out.
      return auth.api.signInEmail({
        body: { email: payload.email, password: body.password },
        asResponse: true,
      });
    });
}