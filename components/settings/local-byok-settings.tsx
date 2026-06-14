"use client";

import { KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { FormEvent, useState, useSyncExternalStore } from "react";

import {
  ByokProvider,
  deleteLocalByokCredential,
  getLocalIntelligenceCredential,
  getLocalByokSnapshot,
  saveLocalByokCredential,
  setLocalIntelligenceMode,
  subscribeToLocalByok,
} from "@/components/chat/byok-storage";

export function LocalByokSettings({ storageKey }: { storageKey: string }) {
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyStatus, setReclassifyStatus] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(
    subscribeToLocalByok,
    () => JSON.stringify(getLocalByokSnapshot(storageKey)),
    () => "{}",
  );
  const stored = JSON.parse(snapshot) as ReturnType<typeof getLocalByokSnapshot>;
  const intelligenceMode = stored.intelligenceMode ?? "free";

  function saveCredential(provider: ByokProvider, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const apiKey = String(form.get("apiKey") ?? "").trim();
    const model = String(form.get("model") ?? "").trim();
    if (apiKey.length < 12) return;
    saveLocalByokCredential(storageKey, { provider, apiKey, model: model || undefined });
    event.currentTarget.reset();
  }

  async function reclassifyInbox() {
    if (reclassifying) return;
    const byok = getLocalIntelligenceCredential(storageKey);
    if (intelligenceMode === "byok" && !byok) {
      setReclassifyStatus("Save and select a BYOK key before reclassifying.");
      return;
    }
    setReclassifying(true);
    setReclassifyStatus(null);
    try {
      const response = await fetch("/api/inbox/reclassify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ byok }),
      });
      const result = await response.json() as { updated?: number; error?: string };
      setReclassifyStatus(response.ok
        ? `${result.updated ?? 0} recent emails reclassified. Manual priority and follow-up choices were preserved.`
        : result.error ?? "Inbox reclassification failed.");
    } catch {
      setReclassifyStatus("Inbox reclassification failed.");
    } finally {
      setReclassifying(false);
    }
  }

  return (
    <>
    <section className="product-panel mt-7 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Inbox intelligence model</h2>
          <p className="mt-1 text-sm text-muted">Free uses Autobot&apos;s OpenRouter free model. BYOK uses the active browser key below. Changing models affects new email automatically.</p>
        </div>
        <div className="product-tab-list">
          {(["free", "byok"] as const).map((mode) => <button key={mode} type="button" aria-pressed={intelligenceMode === mode} onClick={() => setLocalIntelligenceMode(storageKey, mode)} className="product-tab">{mode === "free" ? "Free model" : "Use BYOK"}</button>)}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-muted">After changing models, reclassify recent cached email to refresh AI-generated priority, category, follow-up, and summaries. Anything you changed manually remains locked.</p>
        <button type="button" disabled={reclassifying} onClick={reclassifyInbox} className="product-button-secondary inline-flex shrink-0 items-center justify-center gap-2 px-4 disabled:opacity-60">
          <RefreshCw aria-hidden="true" className={`size-4 ${reclassifying ? "animate-spin" : ""}`} />
          {reclassifying ? "Reclassifying..." : "Reclassify recent inbox"}
        </button>
      </div>
      {reclassifyStatus ? <p role="status" className="mt-3 text-xs font-medium text-forest">{reclassifyStatus}</p> : null}
    </section>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      {(["openai", "openrouter"] as const).map((provider) => {
        const saved = stored.credentials?.[provider];
        const active = stored.activeProvider === provider;
        return (
          <section key={provider} className="product-panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold capitalize text-ink">{provider}</h2>
                <p className="mt-1 text-sm text-muted">
                  {saved
                    ? `${active ? "Active key" : "Key saved locally"}, ending in ${saved.apiKey.slice(-4)}`
                    : "Stored only in this browser profile."}
                </p>
              </div>
              <KeyRound aria-hidden="true" className="size-5 text-forest" />
            </div>
            <form onSubmit={(event) => saveCredential(provider, event)} className="mt-5 grid gap-3">
              <input name="apiKey" type="password" required minLength={12} autoComplete="off" placeholder="API key" className="product-input px-4 text-sm" />
              <input name="model" placeholder={provider === "openrouter" ? "Optional model, e.g. openrouter/free" : "Optional model"} className="product-input px-4 text-sm" />
              <button className="product-button-primary px-4">{saved ? "Replace local key" : "Save key in browser"}</button>
            </form>
            {saved ? (
              <button
                type="button"
                onClick={() => deleteLocalByokCredential(storageKey, provider)}
                className="product-button-secondary mt-2 inline-flex w-full items-center justify-center gap-2 px-4"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Remove local key
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
    </>
  );
}
