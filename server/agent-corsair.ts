import "server-only";

import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { createCorsair } from "corsair";
import { getPool } from "@/lib/db/pool";
import { getServerEnv } from "@/lib/env/server";

const env = getServerEnv();

export const agentCorsair = createCorsair({
  database: getPool(),
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
  approval: {
    timeout: "30m",
    onTimeout: "deny",
    mode: "asynchronous",
    formatAsyncMessage: ({ token }) =>
      `This action needs user approval. Review: ${env.APP_URL}/dashboard/approvals/${token}`,
  },
  plugins: [
    gmail({
      permissions: {
        mode: "strict",
        overrides: {
          "messages.send": "require_approval",
          "messages.delete": "deny",
          "threads.delete": "deny",
          "threads.modify": "require_approval",
          "drafts.create": "require_approval",
          "drafts.update": "require_approval",
          "drafts.send": "require_approval",
        },
      },
    }),
    googlecalendar({
      permissions: {
        mode: "strict",
        overrides: {
          "events.create": "require_approval",
          "events.update": "require_approval",
          "events.delete": "require_approval",
        },
      },
    }),
  ],
});
