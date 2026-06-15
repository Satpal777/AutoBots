"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import {
  clearIntegrationRefreshThrough,
  getIntegrationRefreshNeededAt,
  subscribeToIntegrationRefreshAttention,
} from "@/components/integrations/integration-refresh-attention";

export function GmailSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  refreshAttentionStorageScope,
  clearRefreshAttentionThrough,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "quiet";
  refreshAttentionStorageScope?: string;
  clearRefreshAttentionThrough?: number;
}) {
  const { pending } = useFormStatus();
  const refreshNeededAt = useSyncExternalStore(
    subscribeToIntegrationRefreshAttention,
    () => refreshAttentionStorageScope
      ? getIntegrationRefreshNeededAt(refreshAttentionStorageScope, "gmail")
      : 0,
    () => 0,
  );
  const styles = {
    primary: "product-button-primary",
    secondary: "product-button-secondary",
    quiet: "product-button-secondary",
  } as const;

  useEffect(() => {
    if (refreshAttentionStorageScope && clearRefreshAttentionThrough) {
      clearIntegrationRefreshThrough(
        refreshAttentionStorageScope,
        "gmail",
        clearRefreshAttentionThrough,
      );
    }
  }, [clearRefreshAttentionThrough, refreshAttentionStorageScope]);

  const highlighted = refreshNeededAt > (clearRefreshAttentionThrough ?? 0);

  return (
    <button
      type="submit"
      disabled={pending}
      title={highlighted ? "Chatbot changes are waiting. Refresh Gmail to load the latest data." : undefined}
      className={`inline-flex items-center justify-center gap-2 px-4 disabled:cursor-wait disabled:opacity-60 ${styles[variant]} ${highlighted ? "integration-refresh-needed" : ""}`}
    >
      {pending ? pendingLabel : children}
      {highlighted && !pending ? <span aria-hidden="true" className="integration-refresh-dot" /> : null}
    </button>
  );
}
