import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import {
  createCorsair,
  setupCorsair,
  type SetupCorsairOptions,
} from "corsair";

import { getPool } from "@/lib/db/pool";
import { getServerEnv } from "@/lib/env/server";

const env = getServerEnv();

export const corsair = createCorsair({
  database: getPool(),
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
  approval: {
    timeout: "30m",
    onTimeout: "deny",
    mode: "asynchronous",
    formatAsyncMessage: ({ token }) =>
      `Approval required. Review this action at ${env.APP_URL}/approvals/${token}, then retry.`,
  },
  plugins: [
    gmail({
      permissions: {
        mode: "cautious",
        overrides: {
          "messages.delete": "deny",
          "threads.delete": "deny",
        },
      },
    }),
    googlecalendar({
      permissions: {
        mode: "cautious",
        overrides: {
          "events.delete": "require_approval",
        },
      },
    }),
  ],
});

export function setupConfiguredCorsair(options?: SetupCorsairOptions) {
  return setupCorsair(corsair, options);
}
