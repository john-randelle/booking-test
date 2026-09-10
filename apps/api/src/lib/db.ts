import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env, IS_DEV } from "./env.js";
import { withRetry } from "./retry.js";

export type DB = NodePgDatabase;

interface DbClient {
  db: DB;
  pool: Pool;
}

function attachErrorHandler(pool: Pool): Pool {
  pool.on("error", (error) => {
    console.error("[db] Unexpected error on idle pool client:", error.message);
  });
  return pool;
}

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

interface ProxyOptions {
  host: string;
  port: number;
  user: string;
  database: string;
  region: string;
}

/**
 * Staging / production: RDS Proxy + IAM authentication.
 *
 * The IAM auth token is valid for 15 minutes. By passing `password` as a
 * function, node-postgres calls it for every NEW connection, preventing
 * auth failures on long-lived pools.
 */
async function createProxyClient({
  host,
  port,
  user,
  database,
  region,
}: ProxyOptions): Promise<DbClient> {
  // Dynamic import so the AWS SDK is never loaded in dev / test.
  const { Signer } = await import("@aws-sdk/rds-signer");

  const signer = new Signer({ region, hostname: host, port, username: user });

  const pool = attachErrorHandler(
    new Pool({
      host,
      port,
      database,
      user,
      password: () => signer.getAuthToken(),
      ssl: { rejectUnauthorized: true },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    }),
  );

  return { db: drizzle({ client: pool }), pool };
}

/**
 * Development / test: plain Postgres via a connection string.
 */
function createLocalClient(connectionString: string): DbClient {
  const pool = attachErrorHandler(
    new Pool({ connectionString, connectionTimeoutMillis: 5_000 }),
  );

  return { db: drizzle({ client: pool }), pool };
}

// ---------------------------------------------------------------------------
// Initialization with health check
// ---------------------------------------------------------------------------

async function createDbClient(): Promise<DbClient> {
  // Presence of these vars per NODE_ENV is enforced by the schema in lib/env.ts.
  const client = IS_DEV
    ? createLocalClient(env.DATABASE_URL!)
    : await createProxyClient({
        host: env.DB_PROXY_HOST!,
        port: env.DB_PORT,
        user: env.DB_USER!,
        database: env.DB_NAME!,
        region: env.AWS_REGION,
      });

  await withRetry(
    async () => {
      const start = Date.now();
      await client.pool.query("SELECT 1");
      const target = IS_DEV
        ? `url=${redactUrl(env.DATABASE_URL!)}`
        : `host=${env.DB_PROXY_HOST}`;
      console.info(
        `[db] Health check passed (${Date.now() - start}ms, env=${env.NODE_ENV}, ${target})`,
      );
    },
    {
      onRetry: (error, attempt, delayMs) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[db] Health check attempt ${attempt} failed (${message}); retrying in ${delayMs}ms`,
        );
      },
    },
  );

  return client;
}

/** Strips credentials from a connection URL before logging it. */
function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return "<invalid url>";
  }
}

export const { db, pool } = await createDbClient();

/** Drains the pool. Call on graceful shutdown. */
export async function closeDb(): Promise<void> {
  await pool.end();
}
