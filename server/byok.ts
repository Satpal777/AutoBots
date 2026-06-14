import "server-only";

import { createHash } from "node:crypto";

export function getByokStorageKey(userId: string) {
  const accountScope = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  return `autobot-byok:${accountScope}`;
}
