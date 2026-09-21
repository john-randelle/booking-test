import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env.js";
import { auth } from "./lib/auth.js";
import { sessionMiddleware, type AppEnv } from "./middleware/session.js";
import { requireAuth, requirePermission } from "./middleware/require-permission.js";
import { DrizzleOrganizationRepository } from "./adapter/drizzle-organization-repo.js";
import { OrganizationService } from "./services/organization-service.js";
import { createOrganizationRoutes } from "./routes/organizations.js";
import { syncCalendars, listCalendars } from "./services/calendar-service.js";
import { DrizzleUserRepository } from "./adapter/drizzle-user-repo.js";
import { UserService } from "./services/user-service.js";
import { createUserRoutes } from "./routes/users.js";
import { InvitationService } from "./services/invitation-service.js";
import { ConsoleMailer } from "./adapter/console-mailer.js";
import { createInviteRoutes } from "./routes/invite.js";

// ── composition root ────────────────────────────────────────────────
const organizationService = new OrganizationService(
  new DrizzleOrganizationRepository(),
);

const userRepo = new DrizzleUserRepository();

const invitationService = new InvitationService(new ConsoleMailer());
const userService = new UserService(userRepo, userRepo, invitationService);

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: env.WEB_ORIGIN,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/", (c) => c.text("Hello Hono!"));

// better-auth owns /api/auth/
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

// everything below this line has a session on the context
app.use("/api/*", sessionMiddleware);

app.get("/api/me", requireAuth, (c) => c.json(c.get("session")!.user));

app.route("/api/organizations", createOrganizationRoutes(organizationService));

app.route("/api/users", createUserRoutes(userService));

app.route("/api/invite", createInviteRoutes());

app.get("/api/calendars", requirePermission("calendar", "read"), async (c) =>
  c.json(await listCalendars()),
);
app.post("/api/calendars/sync", requirePermission("calendar", "sync"), async (c) =>
  c.json(await syncCalendars()),
);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});