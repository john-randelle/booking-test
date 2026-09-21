import { betterAuth} from "better-auth";
import { env } from "./env.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import { user, session, account, verification, organization, member, invitation } from "../schema/auth-schema.js";
import { genericOAuth, admin, organization as organizationPlugin } from "better-auth/plugins";
import { ac, adminRole, referrerRole, specialistRole  } from "./roles.js";
import { eq } from "drizzle-orm";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { getRoleFromCognitoToken, getProfileFromCognitoToken } from "./cognito-role.js";

async function syncCognitoRole(account: {
  providerId: string;
  idToken?: string | null;
  userId: string;
}) {
  if (account.providerId !== "cognito" || !account.idToken) return;
  const profile = getProfileFromCognitoToken(account.idToken);
  await db
    .update(user)
    .set({
      role: getRoleFromCognitoToken(account.idToken),
      ...(profile ?? {}),
    })
    .where(eq(user.id, account.userId));
}

export const auth = betterAuth({
  user: {
    additionalFields: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        phone: { type: "string", required: false },
  },
},
  databaseHooks: {
    account: {
        create: { async after(account) { await syncCognitoRole(account); } },
        update: { async after(account) { await syncCognitoRole(account); } },
        hooks: {
          before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-in/email") return;
            const email = ctx.body?.email;
            if (!email) return;

            const rows = await db
              .select({ providerId: account.providerId, password: account.password })
              .from(account)
              .innerJoin(user, eq(account.userId, user.id))
              .where(eq(user.email, email));

            const hasCognito = rows.some((r) => r.providerId === "cognito");
            const credential = rows.find((r) => r.providerId === "credential");

            if (hasCognito && !credential) {
              throw new APIError("FORBIDDEN", { message: "ADMIN_COGNITO_ACCOUNT" });
            }
            if (credential && credential.password === null) {
              throw new APIError("FORBIDDEN", { message: "ACCOUNT_NOT_ACTIVATED" });
      }
   }),
  },
      },
    },

   database: drizzleAdapter(db, {
        provider: "pg", 
        schema: { user, session, account, verification, organization, member, invitation },
    }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
    trustedOrigins: [env.WEB_ORIGIN],
    disabledPaths:["/sign-up/email"],

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
    admin({
      ac,
      roles: { admin: adminRole, referrer: referrerRole, specialist: specialistRole },
      adminRoles: ["admin"],
      defaultRole: "referrer",
    }),
    organizationPlugin({
      allowUserToCreateOrganization: false,
    }),

    
  ],
});

