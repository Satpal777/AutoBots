import { z } from "zod";

export type ByokProvider = "openai" | "openrouter";

export type ByokCredential = {
  provider: ByokProvider;
  apiKey: string;
  model?: string;
};

const LocalCredentialSchema = z.object({
  apiKey: z.string().min(12).max(500),
  model: z.string().min(1).max(200).optional(),
});

const StoredByokSchema = z.object({
  activeProvider: z.enum(["openai", "openrouter"]).optional(),
  credentials: z.object({
    openai: LocalCredentialSchema.optional(),
    openrouter: LocalCredentialSchema.optional(),
  }).optional(),
});

type StoredByok = z.infer<typeof StoredByokSchema>;

const changeEvent = "autobot-byok-change";

export function getLocalByokCredential(storageKey: string): ByokCredential | undefined {
  const stored = readStoredByok(storageKey);
  const provider = stored.activeProvider;
  if (!provider) return undefined;
  const credential = stored.credentials?.[provider];
  if (!credential?.apiKey) return undefined;
  return { provider, ...credential };
}

export function getLocalByokSnapshot(storageKey: string): StoredByok {
  return readStoredByok(storageKey);
}

export function saveLocalByokCredential(storageKey: string, credential: ByokCredential) {
  const stored = readStoredByok(storageKey);
  writeStoredByok(storageKey, {
    activeProvider: credential.provider,
    credentials: {
      ...stored.credentials,
      [credential.provider]: {
        apiKey: credential.apiKey,
        model: credential.model || undefined,
      },
    },
  });
}

export function deleteLocalByokCredential(storageKey: string, provider: ByokProvider) {
  const stored = readStoredByok(storageKey);
  const credentials = { ...stored.credentials };
  delete credentials[provider];
  const activeProvider = stored.activeProvider === provider
    ? (Object.keys(credentials)[0] as ByokProvider | undefined)
    : stored.activeProvider;
  writeStoredByok(storageKey, { activeProvider, credentials });
}

export function subscribeToLocalByok(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readStoredByok(storageKey: string): StoredByok {
  if (typeof window === "undefined") return {};
  try {
    const value = StoredByokSchema.safeParse(JSON.parse(window.localStorage.getItem(storageKey) ?? "{}"));
    return value.success ? value.data : {};
  } catch {
    return {};
  }
}

function writeStoredByok(storageKey: string, value: StoredByok) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
  window.dispatchEvent(new Event(changeEvent));
}
