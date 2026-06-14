import Link from "next/link";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { LocalByokSettings } from "@/components/settings/local-byok-settings";
import { requireSession } from "@/lib/auth/session";
import { getByokStorageKey } from "@/server/byok";
import { deleteChatHistoryAction } from "./actions";

export default async function AiSettingsPage() {
  const session = await requireSession();
  return <>
    <PageHeader label="Settings" title="AI and data controls" description="Choose your own model provider and manage Autobot chat history."
      action={<Link href="/dashboard/settings" className="product-button-secondary inline-flex items-center px-4">Connected apps</Link>} />
    <div className="product-notice mt-5 px-4 py-3 text-sm font-medium">
      BYOK keys stay in this browser profile. Autobot sends the active key only with a BYOK chat request and never saves it on the server.
    </div>
    <LocalByokSettings storageKey={getByokStorageKey(session.user.id)} />
    <section className="product-panel-muted mt-5 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">Chat history</h2><p className="mt-1 text-sm text-muted">Delete every saved Autobot conversation and message.</p>
      <form action={deleteChatHistoryAction} className="mt-4"><button className="product-button-secondary px-4">Delete all chat history</button></form>
    </section>
  </>;
}
