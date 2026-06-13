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
  APP_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_AUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_AUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_INTEGRATION_CLIENT_ID: z.string().min(1),
  GOOGLE_INTEGRATION_CLIENT_SECRET: z.string().min(1),
  CORSAIR_KEK: z
    .string()
    .refine(
      (value) =>
        /^[a-fA-F0-9]{64}$/.test(value) ||
        /^[A-Za-z0-9+/_-]{43}=?$/.test(value),
      "Must be 32 bytes encoded as hexadecimal or Base64",
    ),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  AI_PROVIDER_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(
  input: Record<string, string | undefined>,
): ServerEnv {
  const result = ServerEnvSchema.safeParse({
    ...input,
    APP_URL: input.APP_URL ?? input.BETTER_AUTH_URL,
  });

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
