import { decodeOAuthState, processOAuthCallback } from "corsair/oauth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import { getSpotifyIntegrationCallbackUrl } from "@/lib/integrations/spotify";
import { corsair } from "@/server/corsair";

export const runtime = "nodejs";

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const CallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export async function GET(request: Request) {
  const env = getServerEnv();
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", env.APP_URL));
  }

  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const decodedState = state
    ? decodeOAuthState(state, { maxAgeMs: OAUTH_STATE_MAX_AGE_MS })
    : null;

  if (
    !decodedState ||
    decodedState.plugin !== "spotify" ||
    decodedState.tenantId !== session.user.id
  ) {
    return redirectToSettings("error");
  }

  if (requestUrl.searchParams.has("error")) return redirectToSettings("cancelled");

  const query = CallbackQuerySchema.safeParse({
    code: requestUrl.searchParams.get("code"),
    state,
  });
  if (!query.success) return redirectToSettings("error");

  try {
    const result = await processOAuthCallback(corsair, {
      ...query.data,
      redirectUri: getSpotifyIntegrationCallbackUrl(env.APP_URL),
    });
    if (result.plugin !== "spotify" || result.tenantId !== session.user.id) {
      return redirectToSettings("error");
    }
  } catch {
    return redirectToSettings("error");
  }

  return redirectToSettings("connected");
}

function redirectToSettings(status: "cancelled" | "connected" | "error") {
  const url = new URL("/dashboard/settings", getServerEnv().APP_URL);
  url.searchParams.set("integration", "spotify");
  url.searchParams.set("status", status);
  return NextResponse.redirect(url);
}
