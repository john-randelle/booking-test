import { betterAuth} from "better-auth";
import { env } from "./env.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import { user, session, account, verification } from "../schema/auth-schema.js";

export const auth = betterAuth({
   database: drizzleAdapter(db, {
        provider: "pg", 
        schema: { user, session, account, verification },
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
    enabled: true,
  },
    trustedOrigins: [env.WEB_ORIGIN],
});