"use client";

import { CornerDownLeft, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { replyToGmailThreadAction } from "@/app/(dashboard)/dashboard/inbox/actions";
import { getLocalByokCredential } from "@/components/chat/byok-storage";
import { SendIcon } from "@/components/ui/icons";
import { GmailSubmitButton } from "@/components/gmail/gmail-submit-button";

export function GmailReplyComposer({
  threadId,
  to,
  subject,
  byokStorageKey,
}: {
  threadId: string;
  to: string;
  subject: string;
  byokStorageKey: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [suggestionState, setSuggestionState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");

  useEffect(() => {
    const controller = new AbortController();
    const byok = getLocalByokCredential(byokStorageKey);

    void fetch(
      `/api/inbox/thread/${encodeURIComponent(threadId)}/suggest-reply`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          byok,
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Suggestion request failed.");
        return response.json() as Promise<{ suggestion?: string }>;
      })
      .then((result) => {
        if (!result.suggestion) throw new Error("Suggestion was empty.");
        setSuggestion(result.suggestion);
        setSuggestionState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestionState("unavailable");
      });

    return () => controller.abort();
  }, [byokStorageKey, threadId]);

  function insertSuggestion() {
    if (!suggestion) return;
    setBody(suggestion);
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(suggestion.length, suggestion.length);
    });
  }

  return (
    <form action={replyToGmailThreadAction} className="mt-4">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="subject" value={subject} />
      <label className="sr-only" htmlFor="reply-body">Reply message</label>
      <textarea
        ref={textareaRef}
        id="reply-body"
        name="body"
        required
        rows={6}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey && !body && suggestion) {
            event.preventDefault();
            insertSuggestion();
          }
        }}
        aria-describedby="reply-suggestion-status"
        className="product-input w-full resize-y px-4 py-3 text-sm leading-6"
        placeholder={
          suggestionState === "loading"
            ? "Preparing a reply from this conversation..."
            : suggestion || "Write your reply..."
        }
      />
      <div className="mt-2 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p
          id="reply-suggestion-status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs font-medium text-muted"
        >
          <Sparkles aria-hidden="true" className="size-3.5 text-forest" />
          {getSuggestionStatus(suggestionState, body, suggestion)}
          {suggestionState === "ready" && suggestion && !body ? (
            <>
              <span className="hidden sm:inline">
                {" "}Press{" "}
                <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-semibold text-ink">
                  Tab
                </kbd>{" "}
                to insert.
              </span>
              <span className="sm:hidden"> Tap the suggestion below to insert.</span>
            </>
          ) : null}
        </p>
      </div>
      {suggestion && !body ? (
        <button
          type="button"
          onClick={insertSuggestion}
          className="mt-2 w-full rounded-lg border border-forest/25 bg-surface px-3 py-3 text-left active:translate-y-px sm:hidden"
          aria-label="Insert suggested reply"
        >
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-forest">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Suggested reply
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-muted">
              Tap to insert
              <CornerDownLeft aria-hidden="true" className="size-3.5" />
            </span>
          </span>
          <span className="mt-2 line-clamp-3 block text-sm leading-5 text-ink/80">
            {suggestion}
          </span>
        </button>
      ) : null}
      <div className="mt-3 flex justify-end">
        <GmailSubmitButton pendingLabel="Sending reply...">
          <SendIcon className="size-4" />
          Send reply
        </GmailSubmitButton>
      </div>
    </form>
  );
}

function getSuggestionStatus(
  state: "loading" | "ready" | "unavailable",
  body: string,
  suggestion: string,
) {
  if (state === "loading") return "Preparing a suggested reply";
  if (state === "unavailable") return "Suggestion unavailable. You can still write a reply.";
  if (body === suggestion) return "Suggested reply inserted. Review before sending.";
  if (body) return "Your reply";
  return "Suggested reply ready.";
}
