import "server-only";

import { AppError } from "@/lib/errors/app-error";

export function requireTrustedMutationRequest(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new AppError("Cross-site request rejected.", 403, "CROSS_SITE_REQUEST");
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  if (new URL(origin).origin !== new URL(request.url).origin) {
    throw new AppError("Cross-origin request rejected.", 403, "CROSS_ORIGIN_REQUEST");
  }
}
