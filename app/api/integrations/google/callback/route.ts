import {
  decodeOAuthState,
  processOAuthCallback,
} from "corsair/oauth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import {
  getGoogleIntegrationCallbackUrl,
  GoogleIntegrationPluginSchema,
} from "@/lib/integrations/google";
import { corsair } from "@/server/corsair";

export const runtime = "nodejs";

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
  const decodedState = state ? decodeOAuthState(state) : null;
  const pluginResult = GoogleIntegrationPluginSchema.safeParse(
    decodedState?.plugin,
  );

  if (
    !decodedState ||
    !pluginResult.success ||
    decodedState.tenantId !== session.user.id
  ) {
    return redirectToDashboard("error");
  }

  if (requestUrl.searchParams.has("error")) {
    return redirectToDashboard("cancelled", pluginResult.data);
  }

  const queryResult = CallbackQuerySchema.safeParse({
    code: requestUrl.searchParams.get("code"),
    state,
  });

  if (!queryResult.success) {
    return redirectToDashboard("error", pluginResult.data);
  }

  try {
    const result = await processOAuthCallback(corsair, {
      ...queryResult.data,
      redirectUri: getGoogleIntegrationCallbackUrl(env.APP_URL),
    });

    if (
      result.tenantId !== session.user.id ||
      result.plugin !== pluginResult.data
    ) {
      return redirectToDashboard("error");
    }
  } catch {
    return redirectToDashboard("error", pluginResult.data);
  }

  return redirectToDashboard("connected", pluginResult.data);
}

function redirectToDashboard(
  status: "cancelled" | "connected" | "error",
  plugin?: string,
) {
  const url = new URL("/dashboard", getServerEnv().APP_URL);
  url.searchParams.set("status", status);

  if (plugin) {
    url.searchParams.set("integration", plugin);
  }

  return NextResponse.redirect(url);
}
