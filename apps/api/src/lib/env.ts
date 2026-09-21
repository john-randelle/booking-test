import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const DEV_ENVS = ["development", "test"] as const;

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "staging", "production"]),
    PORT: z.coerce.number(),

    COGNITO_USER_POOL_ID: z.string(),
    COGNITO_CLIENT_ID: z.string(),
    COGNITO_CLIENT_SECRET: z.string(),

    WEB_ORIGIN: z.string().url(),

    INVITE_SECRET: z.string().optional(),
    MAIL_FROM: z.string().optional(),

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

    //Acuity API
    ACUITY_API_KEY: z.string().optional(),
    ACUITY_USER_ID: z.string().optional(),
  },

  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const IS_DEV = (DEV_ENVS as readonly string[]).includes(env.NODE_ENV);
