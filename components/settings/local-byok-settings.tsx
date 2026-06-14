"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { FormEvent, useSyncExternalStore } from "react";

import {
  ByokProvider,
  deleteLocalByokCredential,
  getLocalByokSnapshot,
  saveLocalByokCredential,
  subscribeToLocalByok,
} from "@/components/chat/byok-storage";

export function LocalByokSettings({ storageKey }: { storageKey: string }) {
  const snapshot = useSyncExternalStore(
    subscribeToLocalByok,
    () => JSON.stringify(getLocalByokSnapshot(storageKey)),
    () => "{}",
  );
  const stored = JSON.parse(snapshot) as ReturnType<typeof getLocalByokSnapshot>;

  function saveCredential(provider: ByokProvider, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const apiKey = String(form.get("apiKey") ?? "").trim();
    const model = String(form.get("model") ?? "").trim();
    if (apiKey.length < 12) return;
    saveLocalByokCredential(storageKey, { provider, apiKey, model: model || undefined });
    event.currentTarget.reset();
  }

  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
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
  );
}
