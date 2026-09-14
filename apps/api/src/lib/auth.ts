import { betterAuth} from "better-auth";
import { env } from "./env.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import { user, session, account, verification } from "../schema/auth-schema.js";
import { genericOAuth } from "better-auth/plugins";

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

    plugins: [
    genericOAuth({
      config: [
        {
          providerId: "cognito",
          discoveryUrl: `https://cognito-idp.${env.AWS_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}/.well-known/openid-configuration`,
          clientId: env.COGNITO_CLIENT_ID,
          clientSecret: env.COGNITO_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
          pkce: true,
        },
      ],
    }),
  ],
});

