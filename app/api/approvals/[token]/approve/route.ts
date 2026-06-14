import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { requireTrustedMutationRequest } from "@/lib/auth/request-security";
import { decideApproval } from "@/server/approvals";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  requireTrustedMutationRequest(request);
  const session = await requireApiSession();
  const token = z.string().min(32).max(256).parse((await context.params).token);
  try {
    const result = await decideApproval(session.user.id, token, "approved");
    if (result && typeof result === "object" && "error" in result && result.error) {
      return Response.json(
        { error: "Approval was recorded, but the action failed to execute." },
        { status: 502 },
      );
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: "Approval is unavailable." }, { status: 409 });
  }
}
