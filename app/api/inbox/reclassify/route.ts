import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";
import { reclassifyCachedInbox } from "@/server/intelligence";

const RequestSchema = z.object({
  byok: z.object({
    provider: z.enum(["openai", "openrouter"]),
    apiKey: z.string().trim().min(12).max(500),
    model: z.string().trim().min(1).max(200).optional(),
  }).optional(),
});

export async function POST(request: Request) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid reclassification request." }, { status: 400 });

  try {
    return Response.json(await reclassifyCachedInbox(session.user.id, parsed.data.byok), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Inbox reclassification failed. Check the selected model or key." }, { status: 502 });
  }
}
