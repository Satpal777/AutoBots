"use client";

export type RefreshAttentionIntegration = "gmail" | "calendar";

const CHANGE_EVENT = "autobot-integration-refresh-attention-change";

export function markIntegrationRefreshNeeded(
  storageScope: string,
  integration: RefreshAttentionIntegration,
) {
  try {
    window.localStorage.setItem(getStorageKey(storageScope, integration), String(Date.now()));
  } catch {}
  notifyChange();
}

export function clearIntegrationRefreshThrough(
  storageScope: string,
  integration: RefreshAttentionIntegration,
  refreshedAt: number,
) {
  try {
    const key = getStorageKey(storageScope, integration);
    const neededAt = Number(window.localStorage.getItem(key));
    if (Number.isFinite(neededAt) && neededAt <= refreshedAt) {
      window.localStorage.removeItem(key);
    }
  } catch {}
  notifyChange();
}

export function getIntegrationRefreshNeededAt(
  storageScope: string,
  integration: RefreshAttentionIntegration,
) {
  try {
    const value = Number(window.localStorage.getItem(getStorageKey(storageScope, integration)));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function subscribeToIntegrationRefreshAttention(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getStorageKey(
  storageScope: string,
  integration: RefreshAttentionIntegration,
) {
  return `${storageScope}:refresh-needed:${integration}`;
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
