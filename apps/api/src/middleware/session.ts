import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";


export type AppEnv = {
	Variables: {
		session: typeof auth.$Infer.Session | null;
	};
};

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("session", session);

	await next();
});



