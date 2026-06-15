import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";
import { generateGmailReplySuggestion } from "@/server/gmail-reply-suggestion";
import { getGmailThread } from "@/server/gmail";

const ThreadIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

const RequestSchema = z.object({
  clientTimeZone: z.string().trim().min(1).max(100).refine(isValidTimeZone).default("UTC"),
  byok: z.object({
    provider: z.enum(["openai", "openrouter"]),
    apiKey: z.string().trim().min(12).max(500),
    model: z.string().trim().min(1).max(200).optional(),
  }).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  requireTrustedMutationRequest(request);
  await requireApiSession();
  const [{ threadId: rawThreadId }, parsed] = await Promise.all([
    params,
    RequestSchema.safeParseAsync(await request.json()),
  ]);
  const threadId = ThreadIdSchema.safeParse(rawThreadId);
  if (!threadId.success || !parsed.success) {
    return Response.json({ error: "Invalid reply suggestion request." }, { status: 400 });
  }

  const thread = await getGmailThread(threadId.data);
  if (!thread?.replyTo) {
    return Response.json({ error: "This conversation cannot be replied to." }, { status: 404 });
  }

  try {
    const suggestion = await generateGmailReplySuggestion(
      thread,
      parsed.data.clientTimeZone,
      parsed.data.byok,
    );
    return Response.json({ suggestion }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "A suggested reply could not be generated." },
      { status: 502 },
    );
  }
}

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
