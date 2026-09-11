import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const DEV_ENVS = ["development", "test"] as const;

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "staging", "production"]),
    PORT: z.coerce.number(),

    WEB_ORIGIN: z.string().url(),

    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),

    // Development / test: plain Postgres connection string.
    DATABASE_URL: z.url().optional(),

    // Staging / production: RDS Proxy with IAM authentication.
    DB_PROXY_HOST: z.string().optional(),
    DB_PORT: z.coerce.number(),
    DB_USER: z.string().optional(),
    DB_NAME: z.string().optional(),
    AWS_REGION: z.string(),
  },

  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const IS_DEV = (DEV_ENVS as readonly string[]).includes(env.NODE_ENV);
