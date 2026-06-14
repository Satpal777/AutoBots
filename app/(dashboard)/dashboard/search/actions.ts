"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { correctEntityIntelligence } from "@/server/intelligence";

const CorrectionSchema = z.object({
  entityId: z.string().trim().min(1).max(300),
  priority: z.enum(["high", "normal", "low"]),
  needsFollowUp: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function correctIntelligenceAction(formData: FormData) {
  const session = await requireSession();
  const parsed = CorrectionSchema.safeParse({
    entityId: formData.get("entityId"),
    priority: formData.get("priority"),
    needsFollowUp: formData.get("needsFollowUp"),
  });
  if (!parsed.success) return;
  await correctEntityIntelligence(session.user.id, parsed.data.entityId, parsed.data);
  revalidatePath("/dashboard/search");
}
