import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";

import { getPool } from "./pool";
import * as schema from "./schema/index";

function createDb() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof createDb>;

let database: Database | undefined;

export function getDb(): Database {
  database ??= createDb();
  return database;
}
