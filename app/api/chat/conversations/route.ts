import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";
import { createConversation, deleteConversation, listConversations, renameConversation } from "@/server/chat";

const DeleteSchema = z.object({ conversationId: z.string().uuid() });
const RenameSchema = DeleteSchema.extend({ title: z.string().trim().min(1).max(80) });

export async function GET() {
  const session = await requireApiSession();
  return Response.json(await listConversations(session.user.id));
}

export async function POST(request: Request) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  return Response.json({ id: await createConversation(session.user.id) });
}

export async function DELETE(request: Request) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  const parsed = DeleteSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid conversation." }, { status: 400 });
  await deleteConversation(session.user.id, parsed.data.conversationId);
  return Response.json({ deleted: true });
}

export async function PATCH(request: Request) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  const parsed = RenameSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid conversation." }, { status: 400 });
  await renameConversation(session.user.id, parsed.data.conversationId, parsed.data.title);
  return Response.json({ renamed: true });
}
