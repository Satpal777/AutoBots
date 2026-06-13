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
  });

  if (env.NODE_ENV !== "production") {
    globalForDb.autobotPool = pool;
  }

  return pool;
}
