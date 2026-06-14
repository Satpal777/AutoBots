import { PageHeader } from "@/components/dashboard/workspace-panels";
import { requireSession } from "@/lib/auth/session";
import { getPlanStatus } from "@/server/agent-models";

export default async function UpgradePage() {
  const session = await requireSession();
  const current = await getPlanStatus(session.user.id);
  return <><PageHeader label="Plans" title="More room for daily automation" description="Pro access is currently granted by an Autobot administrator." />
    <div className="mt-7 grid gap-5 md:grid-cols-2">
      {[{ name: "Silver", limit: 5, copy: "A focused daily command center." }, { name: "Pro", limit: 20, copy: "More premium automation for busy days." }].map((plan) => <section key={plan.name} className={`product-panel p-6 ${current.name === plan.name ? "ring-2 ring-forest/20" : ""}`}><p className="text-sm font-semibold text-forest">{plan.name}</p><p className="mt-4 text-4xl font-semibold text-ink">{plan.limit}<span className="text-sm text-muted"> / day</span></p><p className="mt-3 text-sm text-muted">{plan.copy}</p><ul className="mt-5 space-y-2 text-sm text-ink"><li>Premium OpenAI messages</li><li>Automatic OpenRouter free fallback</li><li>OpenAI and OpenRouter BYOK</li><li>Approval-gated Gmail and Calendar actions</li></ul><button disabled className="product-button-secondary mt-6 w-full px-4">{current.name === plan.name ? "Current plan" : "Contact admin to enable"}</button></section>)}
    </div></>;
}
