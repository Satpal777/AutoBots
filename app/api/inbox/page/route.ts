import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { getGmailInbox } from "@/server/gmail";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";

const QuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  pageToken: z.string().trim().min(1).max(2_000).optional(),
});
const RequestSchema = QuerySchema.extend({
  byok: z.object({
    provider: z.enum(["openai", "openrouter"]),
    apiKey: z.string().trim().min(12).max(500),
    model: z.string().trim().min(1).max(200).optional(),
  }).optional(),
});

export async function GET(request: Request) {
  await requireApiSession();
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") || undefined,
    pageToken: url.searchParams.get("pageToken") || undefined,
  });
  if (!parsed.success) return Response.json({ error: "Invalid inbox page request." }, { status: 400 });
  return Response.json(await getGmailInbox(parsed.data.q, parsed.data.pageToken), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  requireTrustedMutationRequest(request);
  await requireApiSession();
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid inbox page request." }, { status: 400 });
  return Response.json(await getGmailInbox(parsed.data.q, parsed.data.pageToken, parsed.data.byok), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
