import { notFound } from "next/navigation";
import { z } from "zod";
import { ApprovalButtons } from "@/components/approvals/approval-buttons";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { requireSession } from "@/lib/auth/session";
import { getApproval } from "@/server/approvals";

export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await requireSession();
  const token = z.string().min(32).max(256).safeParse((await params).token);
  if (!token.success) notFound();
  const approval = await getApproval(session.user.id, token.data);
  if (!approval) notFound();
  let args: unknown = {};
  try { args = JSON.parse(approval.args); } catch {}
  return <>
    <PageHeader label="Approval" title="Review Autobot action" description="The exact frozen action below can run only once." />
    <section className="product-panel mt-7 max-w-3xl p-5 sm:p-7">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><span>{approval.plugin}</span><span>·</span><span>{approval.endpoint}</span><span>·</span><span>{approval.status}</span></div>
      <pre className="mt-5 overflow-x-auto rounded-xl bg-surface-soft p-4 text-xs leading-6 text-ink">{JSON.stringify(args, null, 2)}</pre>
      {approval.status === "pending" ? <ApprovalButtons token={token.data} /> : <p className="mt-5 text-sm font-semibold text-muted">This action is {approval.status}.</p>}
    </section>
  </>;
}
