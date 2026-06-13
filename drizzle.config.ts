import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

loadEnvConfig(process.cwd());

const databaseUrl = z
  .string()
  .url()
  .refine(
    (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
    "DATABASE_URL must be a PostgreSQL URL",
  )
  .parse(process.env.DATABASE_URL);

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
