"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getLocalByokCredential,
  getLocalByokSnapshot,
  subscribeToLocalByok,
} from "@/components/chat/byok-storage";
import { CloseIcon, SparklesIcon } from "@/components/ui/icons";

const STORAGE_KEY = "autobot-inbox-intelligence-notice:v1";
const CHANGE_EVENT = "autobot-inbox-intelligence-notice-change";
let dismissedForSession = false;

export function InboxIntelligenceNotice({
  byokStorageKey,
}: {
  byokStorageKey: string;
}) {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const byokSnapshot = useSyncExternalStore(
    subscribeToLocalByok,
    () => JSON.stringify(getLocalByokSnapshot(byokStorageKey)),
    () => "{}",
  );
  const byok = byokSnapshot === "{}"
    ? undefined
    : getLocalByokCredential(byokStorageKey);

  if (!visible) return null;

  return (
    <div className="mt-5 flex items-start gap-2 rounded-lg border border-success/20 bg-success-soft px-3 py-2 text-xs font-medium text-success">
      <SparklesIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <p className="min-w-0 flex-1 leading-5">
        {byok ? `${byok.provider === "openai" ? "OpenAI" : "OpenRouter"} BYOK organizes this inbox.` : "Free model organizes this inbox."}{" "}
        <Link href="/dashboard/settings/ai" className="font-semibold underline underline-offset-2">
          {byok ? "Manage AI key" : "Add BYOK for better accuracy"}
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss inbox intelligence notice"
        title="Dismiss notice"
        className="grid size-7 shrink-0 place-items-center rounded-md text-success transition hover:bg-success/10"
      >
        <CloseIcon aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot() {
  if (dismissedForSession) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "dismissed";
  } catch {
    return true;
  }
}

function dismiss() {
  dismissedForSession = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
