import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
      "Must be a PostgreSQL URL",
    ),
  APP_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  GOOGLE_AUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_AUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_INTEGRATION_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_INTEGRATION_CLIENT_SECRET: z.string().min(1).optional(),
  CORSAIR_KEK: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "Must be 32 bytes encoded as hexadecimal")
    .optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  AI_PROVIDER_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  const result = ServerEnvSchema.safeParse(input);

  if (!result.success) {
    const invalidVariables = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.map(String).join(".") || "environment",
        ),
      ),
    ];

    throw new Error(
      `Invalid server environment variables: ${invalidVariables.join(", ")}`,
    );
  }

  return result.data;
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
