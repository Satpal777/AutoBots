import "server-only";
import { Pool } from "pg";
import { getServerEnv } from "../env/server";

const globalForDb = globalThis as unknown as {
  autobotPool?: Pool;
};

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const env = getServerEnv();

  if (env.NODE_ENV !== "production" && globalForDb.autobotPool) {
    pool = globalForDb.autobotPool;
    return pool;
  }

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    // Hosted Postgres providers may close idle pooled sockets. Recycle
    // connections and enable TCP keepalive so auth reads do not inherit them.
    max: env.NODE_ENV === "production" ? 10 : 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    maxLifetimeSeconds: 300,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL client error", {
      name: error.name,
      code: "code" in error ? error.code : undefined,
    });
  });

  if (env.NODE_ENV !== "production") {
    globalForDb.autobotPool = pool;
  }

  return pool;
}
