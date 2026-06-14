import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";
import { decideApproval } from "@/server/approvals";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  const token = z.string().min(32).max(256).parse((await context.params).token);
  try {
    return Response.json(await decideApproval(session.user.id, token, "denied"));
  } catch {
    return Response.json({ error: "Approval is unavailable." }, { status: 409 });
  }
}
