import { z } from "zod";

export const GoogleIntegrationPluginSchema = z.enum([
  "gmail",
  "googlecalendar",
]);

export type GoogleIntegrationPlugin = z.infer<
  typeof GoogleIntegrationPluginSchema
>;

export const googleIntegrationDetails = {
  gmail: {
    name: "Gmail",
    description: "Search, draft, send, and organize email.",
  },
  googlecalendar: {
    name: "Google Calendar",
    description: "Manage events, invitations, and availability.",
  },
} as const satisfies Record<
  GoogleIntegrationPlugin,
  { name: string; description: string }
>;

export function getGoogleIntegrationCallbackUrl(appUrl: string): string {
  return new URL("/api/integrations/google/callback", appUrl).toString();
}
