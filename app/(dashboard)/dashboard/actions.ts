"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { GoogleIntegrationPluginSchema } from "@/lib/integrations/google";
import {
  createGoogleIntegrationConnectUrl,
  disconnectGoogleIntegration,
} from "@/server/google-integrations";

const IntegrationActionSchema = z.object({
  plugin: GoogleIntegrationPluginSchema,
});

export async function connectGoogleIntegrationAction(formData: FormData) {
  const result = IntegrationActionSchema.safeParse({
    plugin: formData.get("plugin"),
  });

  if (!result.success) {
    redirect("/dashboard/settings?status=error");
  }

  let destination: string;

  try {
    destination = await createGoogleIntegrationConnectUrl(result.data.plugin);
  } catch {
    destination = `/dashboard/settings?integration=${result.data.plugin}&status=error`;
  }

  redirect(destination);
}

export async function disconnectGoogleIntegrationAction(formData: FormData) {
  const result = IntegrationActionSchema.safeParse({
    plugin: formData.get("plugin"),
  });

  if (!result.success) {
    redirect("/dashboard/settings?status=error");
  }

  let status = "disconnected";

  try {
    await disconnectGoogleIntegration(result.data.plugin);
    revalidatePath("/dashboard");
  } catch {
    status = "error";
  }

  redirect(`/dashboard/settings?integration=${result.data.plugin}&status=${status}`);
}
