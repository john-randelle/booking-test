import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env.js";
import { auth } from "./lib/auth.js";
import { sessionMiddleware, type AppEnv } from "./middleware/session.js";
import { requireAuth } from "./middleware/require-permission.js";
import { DrizzleOrganizationRepository } from "./adapter/drizzle-organization-repo.js";
import { OrganizationService } from "./services/organization-service.js";
import { createOrganizationRoutes } from "./routes/organizations.js";
import { CalendarService } from "./services/calendar-service.js";
import { DrizzleCalendarRepository } from "./adapter/drizzle-calendar-repo.js";
import { AcuityCalendarSource } from "./adapter/acuity-calendar-source.js";
import { DrizzleUserRepository } from "./adapter/drizzle-user-repo.js";
import { UserService } from "./services/user-service.js";
import { createUserRoutes } from "./routes/users.js";
import { InvitationService } from "./services/invitation-service.js";
import { ConsoleMailer } from "./adapter/console-mailer.js";
import { createInviteRoutes } from "./routes/invite.js";
import { createCalendarRoutes } from "./routes/calendars.js";
import { AppointmentService } from "./services/appointment-service.js";
import { DrizzleAppointmentRepository } from "./adapter/drizzle-appointment-repo.js";
import { AcuityAppointmentSource } from "./adapter/acuity-appointment-source.js";
import { createAppointmentRoutes } from "./routes/appointments.js";
import { createAcuityWebhookRoutes } from "./routes/acuity-webhooks.js";
import { isValidAcuitySignature } from "./lib/acuity/webhook.js";
import { startAppointmentSyncJob } from "./jobs/appointment-sync-job.js";

// ── composition root ────────────────────────────────────────────────
const organizationService = new OrganizationService(
  new DrizzleOrganizationRepository(),
);

const userRepo = new DrizzleUserRepository();

const calendarRepo = new DrizzleCalendarRepository();

const calendarService = new CalendarService(
  calendarRepo,
  new AcuityCalendarSource(),
  userRepo,
);

const invitationService = new InvitationService(new ConsoleMailer());
const userService = new UserService(userRepo, userRepo, invitationService, calendarService);

const appointmentService = new AppointmentService(
  new DrizzleAppointmentRepository(),
  new AcuityAppointmentSource(env.ACUITY_REFERRER_FIELD),
  userRepo,
  calendarRepo,
);

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

// Acuity calls this directly: authenticated by signature, not by session
app.route(
  "/api/webhooks/acuity",
  createAcuityWebhookRoutes(appointmentService, (body, signature) =>
    isValidAcuitySignature(body, signature, env.ACUITY_API_KEY),
  ),
);

// everything below this line has a session on the context
app.use("/api/*", sessionMiddleware);

app.get("/api/me", requireAuth, (c) => c.json(c.get("session")!.user));

app.route("/api/organizations", createOrganizationRoutes(organizationService));

app.route("/api/users", createUserRoutes(userService));

app.route("/api/invite", createInviteRoutes());

app.route("/api/calendars", createCalendarRoutes(calendarService));

app.route("/api/appointments", createAppointmentRoutes(appointmentService));

if (env.APPOINTMENT_SYNC_INTERVAL_MINUTES > 0) {
  startAppointmentSyncJob(appointmentService, env.APPOINTMENT_SYNC_INTERVAL_MINUTES);
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});