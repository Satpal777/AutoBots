"use client";

import {
  Bot,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Gift,
  Infinity as InfinityIcon,
  KeyRound,
  LoaderCircle,
  Mail,
  MailSearch,
  MapPin,
  Pencil,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  SendHorizontal,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  getLocalByokCredential,
  getLocalByokSnapshot,
  subscribeToLocalByok,
} from "@/components/chat/byok-storage";
import {
  markIntegrationRefreshNeeded,
  type RefreshAttentionIntegration,
} from "@/components/integrations/integration-refresh-attention";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type ActionChatCard,
  type CalendarChatCard,
  type ChatCard,
  type ChatStreamEvent,
  type EmailChatCard,
  readChatCards,
} from "@/lib/ai/chat-cards";
import { cn } from "@/lib/utils";

type Conversation = { id: string; title: string };
type Message = { id: string; role: string; content: string; metadata?: unknown; cards?: ChatCard[] };
type ChatMode = "auto" | "premium" | "free" | "byok";
type IntegrationStatuses = { gmail: string; googlecalendar: string };

export function ChatWorkspace({
  conversations,
  activeId,
  initialMessages,
  plan,
  approvals,
  integrations,
  byokStorageKey,
  userName,
}: {
  conversations: Conversation[];
  activeId: string;
  initialMessages: Message[];
  plan: { name: string; used: number; limit: number; remaining: number };
  approvals: { token: string; plugin: string; endpoint: string }[];
  integrations: IntegrationStatuses;
  byokStorageKey: string;
  userName: string;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const scrollIdleTimeoutRef = useRef<number | null>(null);
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const followLatestRef = useRef(true);
  const [messages, setMessages] = useState(() => initialMessages.map((item) => ({
    ...item,
    cards: readChatCards(item.metadata),
  })));
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<ChatMode>("auto");
  const [autoApprove, setAutoApprove] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showLatestButton, setShowLatestButton] = useState(false);
  const [messageListScrolling, setMessageListScrolling] = useState(false);
  const historyOpen = useSyncExternalStore(
    subscribeToChatHistoryVisibility,
    () => getChatHistoryVisibilitySnapshot(byokStorageKey),
    () => true,
  );
  const byokSnapshot = useSyncExternalStore(
    subscribeToLocalByok,
    () => JSON.stringify(getLocalByokSnapshot(byokStorageKey)),
    () => "{}",
  );
  const activeByok = byokSnapshot === "{}"
    ? undefined
    : getLocalByokCredential(byokStorageKey);
  const effectiveMode: ChatMode = activeByok ? "byok" : mode;

  function toggleHistory() {
    try {
      window.localStorage.setItem(
        getChatHistoryVisibilityStorageKey(byokStorageKey),
        String(!historyOpen),
      );
    } catch {}
    window.dispatchEvent(new Event(CHAT_HISTORY_VISIBILITY_CHANGE_EVENT));
  }

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const smooth =
      behavior === "smooth" && !reducedMotion && distanceFromBottom > 1;

    programmaticScrollRef.current = smooth;
    if (programmaticScrollTimeoutRef.current) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }
    if (smooth) {
      programmaticScrollTimeoutRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 600);
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const followLatest = useCallback(() => {
    followLatestRef.current = true;
    setShowLatestButton(false);
    scrollToLatest("smooth");
  }, [scrollToLatest]);

  function handleMessageListScroll() {
    const viewport = messageViewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const nearLatest = distanceFromBottom < 96;

    if (programmaticScrollRef.current) {
      followLatestRef.current = true;
      setShowLatestButton(false);
      if (nearLatest) {
        programmaticScrollRef.current = false;
        if (programmaticScrollTimeoutRef.current) {
          window.clearTimeout(programmaticScrollTimeoutRef.current);
        }
      }
    } else {
      followLatestRef.current = nearLatest;
      setShowLatestButton(!nearLatest && viewport.scrollHeight > viewport.clientHeight);
    }
    setMessageListScrolling(true);

    if (scrollIdleTimeoutRef.current) {
      window.clearTimeout(scrollIdleTimeoutRef.current);
    }
    scrollIdleTimeoutRef.current = window.setTimeout(() => {
      setMessageListScrolling(false);
    }, 700);
  }

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight);
    const verticalPadding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const maxHeight = lineHeight * 10 + verticalPadding;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [message]);

  useLayoutEffect(() => {
    followLatestRef.current = true;
    scrollToLatest("auto");
  }, [activeId, scrollToLatest]);

  useEffect(() => {
    if (!followLatestRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToLatest(pending ? "auto" : "smooth");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error, messages, pending, scrollToLatest]);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (followLatestRef.current) {
        scrollToLatest("auto");
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [scrollToLatest]);

  useEffect(() => {
    return () => {
      if (scrollIdleTimeoutRef.current) {
        window.clearTimeout(scrollIdleTimeoutRef.current);
      }
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  async function send() {
    const content = message.trim();
    if (!content || pending) return;
    followLatestRef.current = true;
    setShowLatestButton(false);
    setMessage("");
    setError("");
    const byok = getLocalByokCredential(byokStorageKey);
    const requestMode: ChatMode = byok ? "byok" : mode;
    if (requestMode === "byok" && !byok) {
      setMessage(content);
      setError("Add an OpenAI or OpenRouter key in Settings first.");
      return;
    }
    setPending(true);
    const userMessage = { id: crypto.randomUUID(), role: "user", content, cards: [] };
    const assistantId = crypto.randomUUID();
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", cards: [] }]);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          message: content,
          mode: requestMode,
          byok,
          autoApprove,
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!response.ok || !response.body) {
        const error = await response.text();
        throw new Error(error.startsWith("{") ? (JSON.parse(error).error ?? "Chat failed.") : "Chat failed.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n");
        buffer = chunk.done ? "" : (lines.pop() ?? "");
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          setMessages((current) => current.map((item) => {
            if (item.id !== assistantId) return item;
            if (event.type === "text-delta") return { ...item, content: item.content + event.delta };
            if (event.type === "cards") return { ...item, cards: mergeCards(item.cards ?? [], event.cards) };
            return item;
          }));
          if (event.type === "cards") {
            markCompletedActionRefreshes(byokStorageKey, event.cards);
          }
        }
        if (chunk.done) break;
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Autobot could not answer.");
    } finally {
      setPending(false);
    }
  }

  async function createNew() {
    if (pending) return;
    if (messages.length === 0) {
      setMessage("");
      setError("");
      textareaRef.current?.focus();
      return;
    }

    const response = await fetch("/api/chat/conversations", { method: "POST" });
    if (!response.ok) {
      setError("Could not start a new conversation.");
      return;
    }
    const result = await response.json();
    setMessages([]);
    setMessage("");
    setError("");
    router.push(`/dashboard/chat?conversation=${result.id}`);
  }

  async function deleteActive() {
    await fetch("/api/chat/conversations", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: activeId }) });
    router.push("/dashboard/chat");
    router.refresh();
  }

  async function renameActive() {
    const title = window.prompt("Conversation name");
    if (!title?.trim()) return;
    await fetch("/api/chat/conversations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: activeId, title }) });
    router.refresh();
  }

  function updateActionCard(cardId: string, status: ActionChatCard["status"]) {
    if (status === "completed") {
      const action = messages
        .flatMap((item) => item.cards ?? [])
        .find((card): card is ActionChatCard => card.kind === "action" && card.id === cardId);
      if (action) markActionRefreshNeeded(byokStorageKey, action.integration);
    }
    setMessages((current) => current.map((item) => ({
      ...item,
      cards: item.cards?.map((card) => card.kind === "action" && card.id === cardId
        ? { ...card, status, approvalUrl: null }
        : card),
    })));
  }

  return (
    <div className={cn(
      "chat-workspace-grid",
      "grid min-h-[calc(100svh-8.5rem)] gap-3 md:h-[calc(100svh-8.5rem)] md:min-h-0 md:overflow-hidden lg:h-full",
      historyOpen
        ? "md:grid-cols-[minmax(0,1fr)_15rem] lg:grid-cols-[minmax(0,1fr)_17rem]"
        : "md:grid-cols-1",
    )}>
      <Card className="chat-workspace-card flex h-[calc(100svh-8.5rem)] min-h-[30rem] min-w-0 flex-col overflow-hidden md:h-auto md:min-h-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{conversations.find((item) => item.id === activeId)?.title ?? "Autobot Chat"}</p>
            <p className="text-xs text-muted">{pending ? "Autobot is working..." : "Ready for your next command"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleHistory}
              variant="secondary"
              size="icon"
              aria-label={historyOpen ? "Hide chat history" : "Show chat history"}
              title={historyOpen ? "Hide chat history" : "Show chat history"}
            >
              {historyOpen
                ? <PanelRightClose aria-hidden="true" className="size-4" />
                : <PanelRightOpen aria-hidden="true" className="size-4" />}
            </Button>
            <Button asChild variant="secondary" size="icon">
              <Link
                href="/dashboard/settings#ai-and-data"
                aria-label="Open AI and data settings"
                title="AI and data settings"
              >
                <Settings2 aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1">
          <div
            ref={messageViewportRef}
            onScroll={handleMessageListScroll}
            className={cn(
              "chat-scroll-area h-full overflow-y-auto overscroll-contain p-5 sm:p-7",
              messageListScrolling && "is-scrolling",
            )}
          >
            <div className="flex min-h-full flex-col gap-4">
              {messages.length === 0 ? (
                <EmptyChat
                  userName={userName}
                  plan={plan}
                  mode={effectiveMode}
                  setMessage={setMessage}
                />
              ) : null}
              <div className={cn("space-y-4", messages.length > 0 && "mt-auto")}>
                {approvals.map((approval) => (
                  <PendingApprovalCard
                    key={approval.token}
                    token={approval.token}
                    title={`${approval.plugin}: ${approval.endpoint}`}
                    integration={toRefreshAttentionIntegration(approval.plugin)}
                    refreshAttentionStorageScope={byokStorageKey}
                  />
                ))}
                {messages.map((item) => (
                  <div key={item.id} className={item.role === "user" ? "ml-auto max-w-[80%]" : "max-w-[88%]"}>
                    {item.role === "user" ? (
                      <div className="whitespace-pre-wrap rounded-xl bg-forest px-4 py-3 text-sm leading-6 text-white">
                        {item.content}
                      </div>
                    ) : (
                      <Card className="whitespace-pre-wrap border-0 bg-surface-soft px-4 py-3 text-sm leading-6">
                        {item.content || (pending ? "Thinking..." : "")}
                      </Card>
                    )}
                    {item.role === "assistant" && item.cards?.length ? <ChatCards cards={item.cards} onActionStatus={updateActionCard} /> : null}
                  </div>
                ))}
                {error ? <Alert variant="destructive">{error}</Alert> : null}
              </div>
            </div>
          </div>
          {showLatestButton ? (
            <Button
              onClick={followLatest}
              variant="secondary"
              size="sm"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-raised"
              aria-label="Jump to latest message"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
              Latest
            </Button>
          ) : null}
        </div>
        <div className="shrink-0 border-t border-line bg-surface p-4">
          <IntegrationConnectionNotice integrations={integrations} />
          <ChatComposer message={message} setMessage={setMessage} mode={effectiveMode} setMode={setMode} byokActive={Boolean(activeByok)} autoApprove={autoApprove} setAutoApprove={setAutoApprove} integrations={integrations} pending={pending} send={send} textareaRef={textareaRef} />
        </div>
      </Card>

      {historyOpen ? <Card className="chat-history-panel flex min-h-0 flex-col overflow-hidden p-3 md:h-full">
        <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-sm font-semibold text-ink">Conversations</p>
            <p className="mt-0.5 text-xs text-muted">{conversations.length} saved</p>
          </div>
          <Button
            onClick={createNew}
            disabled={pending}
            aria-label="Create new conversation"
            title="Create new conversation"
            size="icon"
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain border-y border-line py-2">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              asChild
              variant={conversation.id === activeId ? "subtle" : "ghost"}
              size="sm"
              className="w-full justify-start"
            >
              <Link
                href={`/dashboard/chat?conversation=${conversation.id}`}
                aria-current={conversation.id === activeId ? "page" : undefined}
                className="truncate"
              >
                {conversation.title}
              </Link>
            </Button>
          ))}
        </div>

        <div className="shrink-0 pt-3">
          <div className="flex justify-end gap-2">
            <Button
              onClick={renameActive}
              aria-label="Rename conversation"
              title="Rename conversation"
              variant="secondary"
              size="icon"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
              onClick={deleteActive}
              aria-label="Delete conversation"
              title="Delete conversation"
              variant="destructive"
              size="icon"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <Card className="mt-3 border-0 bg-surface-soft p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{plan.name}</span><span>{plan.used}/{plan.limit}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-forest" style={{ width: `${Math.min((plan.used / plan.limit) * 100, 100)}%` }} />
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
              <Link href="/dashboard/upgrade">View plans</Link>
            </Button>
          </Card>
        </div>
      </Card> : null}
    </div>
  );
}

function ChatCards({ cards, onActionStatus }: { cards: ChatCard[]; onActionStatus: (cardId: string, status: ActionChatCard["status"]) => void }) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {cards.map((card, index) => {
        const key = `${card.kind}:${card.id}:${index}`;
        if (card.kind === "email") return <EmailCard key={key} card={card} />;
        if (card.kind === "calendar") return <CalendarCard key={key} card={card} />;
        return <ActionCard key={key} card={card} onStatus={(status) => onActionStatus(card.id, status)} />;
      })}
    </div>
  );
}

function EmailCard({ card }: { card: EmailChatCard }) {
  return (
    <Link
      href={getEmailCardHref(card)}
      className="group"
    >
      <Card className="h-full p-4 transition-colors hover:border-forest/30 hover:bg-surface-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest-soft text-forest">
            <Mail aria-hidden="true" className="size-4" />
          </div>
          <span className="text-[0.68rem] font-semibold text-muted">{formatCardDate(card.receivedAt)}</span>
        </div>
        <p className="mt-3 truncate text-xs font-medium text-muted">{card.from ?? "Sender unavailable"}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{card.subject ?? "Email without a subject"}</p>
        {card.snippet ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{card.snippet}</p> : null}
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-forest">
          <span>{card.unread ? "Unread" : "Email"}</span>
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </div>
      </Card>
    </Link>
  );
}

function CalendarCard({ card }: { card: CalendarChatCard }) {
  return (
    <Link
      href={getCalendarCardHref(card)}
      className="group"
    >
      <Card className="h-full p-4 transition-colors hover:border-gold/50 hover:bg-surface-soft">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-forest">
            <CalendarDays aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-ink">{card.title ?? "Untitled event"}</p>
            <p className="mt-1 text-xs font-medium text-muted">{formatEventTime(card)}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-muted">
          {card.location ? <p className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5" /><span className="truncate">{card.location}</span></p> : null}
          {card.attendeeCount > 0 ? <p className="flex items-center gap-1.5"><Users aria-hidden="true" className="size-3.5" />{card.attendeeCount} attendee{card.attendeeCount === 1 ? "" : "s"}</p> : null}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-forest">
          <span>{card.allDay ? "All day" : card.timeZone ?? "Calendar"}</span>
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </div>
      </Card>
    </Link>
  );
}

function getEmailCardHref(card: EmailChatCard) {
  const fallback = `/dashboard/inbox/thread/${encodeURIComponent(card.threadId)}`;
  return card.href?.startsWith("/dashboard/inbox/thread/") ? card.href : fallback;
}

function getCalendarCardHref(card: CalendarChatCard) {
  const fallback = `/dashboard/calendar/event/${encodeURIComponent(card.id)}`;
  return card.href?.startsWith("/dashboard/calendar/event/") ? card.href : fallback;
}

function ActionCard({ card, onStatus }: { card: ActionChatCard; onStatus: (status: ActionChatCard["status"]) => void }) {
  const token = card.approvalUrl?.match(/\/dashboard\/approvals\/([A-Za-z0-9_-]+)/)?.[1];
  const content = (
    <Card className="border-gold/40 bg-gold-soft p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-forest">
          {card.status === "pending" ? <ShieldAlert aria-hidden="true" className="size-4" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-forest">{formatActionStatus(card.status)}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{card.title}</p>
        </div>
      </div>
      {card.details.length > 0 ? <div className="mt-3 space-y-1 text-xs text-muted">{card.details.map((detail) => <p key={detail} className="truncate">{detail}</p>)}</div> : null}
      {card.status === "pending" && token ? <InlineApprovalControls token={token} onStatus={onStatus} /> : null}
    </Card>
  );
  return content;
}

function PendingApprovalCard({
  token,
  title,
  integration,
  refreshAttentionStorageScope,
}: {
  token: string;
  title: string;
  integration: RefreshAttentionIntegration | null;
  refreshAttentionStorageScope: string;
}) {
  const [status, setStatus] = useState<ActionChatCard["status"]>("pending");
  if (status !== "pending") return null;
  return <Card className="border-gold/40 bg-gold-soft p-4"><p className="text-xs font-semibold uppercase tracking-wider text-forest">Approval needed</p><p className="mt-1 text-sm font-semibold text-ink">{title}</p><InlineApprovalControls token={token} onStatus={(nextStatus) => {
    if (nextStatus === "completed" && integration) {
      markIntegrationRefreshNeeded(refreshAttentionStorageScope, integration);
    }
    setStatus(nextStatus);
  }} /></Card>;
}

function InlineApprovalControls({ token, onStatus }: { token: string; onStatus: (status: ActionChatCard["status"]) => void }) {
  const [working, setWorking] = useState(false);
  async function decide(decision: "approve" | "deny") {
    if (working) return;
    setWorking(true);
    try {
      const response = await fetch(`/api/approvals/${encodeURIComponent(token)}/${decision}`, { method: "POST" });
      onStatus(response.ok ? (decision === "approve" ? "completed" : "denied") : "failed");
    } catch {
      onStatus("failed");
    } finally {
      setWorking(false);
    }
  }
  return <div className="mt-3 flex gap-2"><Button disabled={working} onClick={() => decide("approve")} size="sm">Approve and run</Button><Button disabled={working} onClick={() => decide("deny")} variant="secondary" size="sm">Deny</Button></div>;
}

function formatActionStatus(status: ActionChatCard["status"]) {
  return status === "pending" ? "Approval needed" : status === "completed" ? "Completed" : status === "denied" ? "Denied" : "Failed";
}

function markCompletedActionRefreshes(storageScope: string, cards: ChatCard[]) {
  cards.forEach((card) => {
    if (card.kind === "action" && card.status === "completed") {
      markActionRefreshNeeded(storageScope, card.integration);
    }
  });
}

function markActionRefreshNeeded(
  storageScope: string,
  integration: ActionChatCard["integration"],
) {
  const refreshIntegration = toRefreshAttentionIntegration(integration);
  if (refreshIntegration) {
    markIntegrationRefreshNeeded(storageScope, refreshIntegration);
  }
}

function toRefreshAttentionIntegration(value: string): RefreshAttentionIntegration | null {
  if (value === "gmail") return "gmail";
  if (value === "calendar" || value === "googlecalendar") return "calendar";
  return null;
}

function mergeCards(current: ChatCard[], incoming: ChatCard[]) {
  const cards = new Map(current.map((card) => [`${card.kind}:${card.id}`, card]));
  incoming.forEach((card) => cards.set(`${card.kind}:${card.id}`, card));
  return [...cards.values()];
}

function formatCardDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  try {
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return "";
  }
}

function formatEventTime(card: CalendarChatCard) {
  if (!card.startAt) return "Time not available";
  try {
    if (card.allDay) return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${card.startAt}T00:00:00Z`));
    const start = new Date(card.startAt);
    if (Number.isNaN(start.getTime())) return card.startAt;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: card.timeZone ?? "UTC",
    }).format(start);
  } catch {
    return card.startAt;
  }
}

function EmptyChat({
  userName,
  plan,
  setMessage,
  mode,
}: {
  userName: string;
  plan: { name: string; used: number; limit: number; remaining: number };
  setMessage: (message: string) => void;
  mode: ChatMode;
}) {
  const prompts = [
    { label: "Latest emails", prompt: "Show me my five latest emails.", icon: MailSearch },
    { label: "Find free time", prompt: "Find a free hour next Thursday for a meeting.", icon: Search },
    { label: "Plan a meeting", prompt: "Draft an email and calendar invite for my next client call.", icon: CalendarPlus },
    { label: "Daily summary", prompt: "Summarize what needs my attention today.", icon: Sparkles },
  ];
  const firstName = userName.trim().split(/\s+/)[0] || "there";

  return <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-8 text-center sm:py-12">
    <AutobotSignal />
    <p className="mt-7 text-base font-semibold text-muted">Hello, {firstName}.</p>
    <h1 className="mt-1 text-balance text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
      What should Autobot handle today?
    </h1>
    <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-6 text-muted">
      Search your workspace, prepare an email, or arrange a meeting. Auto-approve can run prepared actions immediately.
    </p>

    <div className="mt-8">
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map(({ label, prompt, icon: Icon }) => (
          <Button key={label} onClick={() => setMessage(prompt)} variant="secondary" size="sm">
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </Button>
        ))}
      </div>
      <UsageIndicator plan={plan} mode={mode} />
    </div>
  </div>;
}

const CONNECTION_NOTICE_CHANGE_EVENT = "autobot-chat-connection-notice-change";
const CHAT_HISTORY_VISIBILITY_CHANGE_EVENT =
  "autobot-chat-history-visibility-change";
const dismissedConnectionNotices = new Set<string>();

function IntegrationConnectionNotice({
  integrations,
}: {
  integrations: IntegrationStatuses;
}) {
  const gmailMissing = integrations.gmail !== "connected";
  const calendarMissing = integrations.googlecalendar !== "connected";
  const missingKey = [
    gmailMissing ? "gmail" : "",
    calendarMissing ? "googlecalendar" : "",
  ]
    .filter(Boolean)
    .join("+");
  const storageKey = `autobot-chat-connection-notice:v1:${missingKey}`;
  const visible = useSyncExternalStore(
    subscribeToConnectionNotice,
    () => getConnectionNoticeSnapshot(storageKey),
    () => true,
  );

  if ((!gmailMissing && !calendarMissing) || !visible) return null;

  const message =
    gmailMissing && calendarMissing
      ? "Connect Gmail and Google Calendar so Autobot can search your workspace and prepare actions."
      : gmailMissing
        ? "Connect Gmail so Autobot can search email and prepare replies."
        : "Connect Google Calendar so Autobot can review events and find availability.";

  return (
    <Alert variant="warning" role="status" className="mb-3 flex items-start gap-3 px-3 py-2.5">
      <p className="min-w-0 flex-1 leading-5">
        {message}{" "}
        <Link
          href="/dashboard/settings"
          className="font-semibold text-forest underline underline-offset-2"
        >
          Connect apps
        </Link>
      </p>
      <Button
        onClick={() => dismissConnectionNotice(storageKey)}
        aria-label="Dismiss connection notice"
        title="Dismiss notice"
        variant="ghost"
        size="icon-sm"
        className="text-forest"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </Alert>
  );
}

function subscribeToConnectionNotice(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONNECTION_NOTICE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONNECTION_NOTICE_CHANGE_EVENT, onChange);
  };
}

function subscribeToChatHistoryVisibility(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHAT_HISTORY_VISIBILITY_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHAT_HISTORY_VISIBILITY_CHANGE_EVENT, onChange);
  };
}

function getChatHistoryVisibilityStorageKey(storageScope: string) {
  return `${storageScope}:chat-history-open`;
}

function getChatHistoryVisibilitySnapshot(storageScope: string) {
  try {
    return (
      window.localStorage.getItem(
        getChatHistoryVisibilityStorageKey(storageScope),
      ) !== "false"
    );
  } catch {
    return true;
  }
}

function getConnectionNoticeSnapshot(storageKey: string) {
  if (dismissedConnectionNotices.has(storageKey)) return false;
  try {
    return window.localStorage.getItem(storageKey) !== "dismissed";
  } catch {
    return true;
  }
}

function dismissConnectionNotice(storageKey: string) {
  dismissedConnectionNotices.add(storageKey);
  try {
    window.localStorage.setItem(storageKey, "dismissed");
  } catch {}
  window.dispatchEvent(new Event(CONNECTION_NOTICE_CHANGE_EVENT));
}

function UsageIndicator({
  plan,
  mode,
}: {
  plan: { name: string; used: number; limit: number; remaining: number };
  mode: ChatMode;
}) {
  if (mode === "byok") {
    const label = "BYOK active. Messages use the provider key saved in this browser.";
    return (
      <div className="chat-usage-wrap">
        <Badge variant="success" className="chat-usage-indicator" tabIndex={0} aria-label={label}>
          <KeyRound aria-hidden="true" className="size-4" />
          <span className="chat-usage-tooltip" role="tooltip">{label}</span>
        </Badge>
      </div>
    );
  }

  const freeActive = mode === "free" || (mode === "auto" && plan.remaining === 0);
  const ratio = plan.limit > 0 ? plan.remaining / plan.limit : 0;
  const label = freeActive
    ? "Free model active. Messages do not use your premium allowance."
    : `${plan.remaining} of ${plan.limit} premium messages remain until 00:00 UTC.`;
  const variant = freeActive
    ? "secondary"
    : ratio > 0.5
      ? "success"
      : ratio > 0.2
        ? "warning"
        : "destructive";

  return (
    <div className="chat-usage-wrap">
      <Badge variant={variant} className="chat-usage-indicator" tabIndex={0} aria-label={label}>
        {freeActive ? <InfinityIcon aria-hidden="true" className="size-4" /> : <span>{plan.remaining}/{plan.limit}</span>}
        <span className="chat-usage-tooltip" role="tooltip">{label}</span>
      </Badge>
    </div>
  );
}

function ChatComposer({
  message,
  setMessage,
  mode,
  setMode,
  byokActive,
  autoApprove,
  setAutoApprove,
  integrations,
  pending,
  send,
  textareaRef,
}: {
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  byokActive: boolean;
  autoApprove: boolean;
  setAutoApprove: (value: boolean) => void;
  integrations: IntegrationStatuses;
  pending: boolean;
  send: () => Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modeTriggerRef = useRef<HTMLButtonElement>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [modeMenuPosition, setModeMenuPosition] = useState({ left: 0, bottom: 0, width: 336 });
  const selectedMode = CHAT_MODES.find((item) => item.value === mode) ?? CHAT_MODES[0];
  const SelectedModeIcon = selectedMode.icon;

  useEffect(() => {
    if (!modeMenuOpen) return;

    function positionMenu() {
      const trigger = modeTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(336, window.innerWidth - 24);
      setModeMenuPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        bottom: window.innerHeight - rect.top + 8,
        width,
      });
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node;
      if (!modeMenuRef.current?.contains(target) && !modeTriggerRef.current?.contains(target)) {
        setModeMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setModeMenuOpen(false);
    }

    positionMenu();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [modeMenuOpen]);

  return (
    <div className="chat-composer">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
        rows={1}
        placeholder="Ask Autobot about your email or calendar..."
        className="max-h-[16rem] min-h-11 resize-none border-0 bg-transparent px-3 py-2.5 leading-6 focus-visible:border-transparent focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-3 border-t border-line px-2.5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
          <div className="relative shrink-0">
            <Button
              ref={modeTriggerRef}
              aria-haspopup="menu"
              aria-expanded={modeMenuOpen}
              aria-label={`AI mode: ${selectedMode.label}`}
              title={`AI mode: ${selectedMode.label}`}
              onClick={() => setModeMenuOpen((open) => !open)}
              variant="ghost"
              size="sm"
              className="chat-mode-trigger"
            >
              <SelectedModeIcon aria-hidden="true" className="size-3.5" />
              <span className="hidden truncate min-[430px]:inline">{selectedMode.label}</span>
              <ChevronDown aria-hidden="true" className={`hidden size-3.5 transition-transform min-[430px]:block ${modeMenuOpen ? "rotate-180" : ""}`} />
            </Button>
            {modeMenuOpen && typeof document !== "undefined" ? createPortal(
              <div
                ref={modeMenuRef}
                role="menu"
                aria-label="Choose AI mode"
                className="chat-mode-menu"
                style={{ left: modeMenuPosition.left, bottom: modeMenuPosition.bottom, width: modeMenuPosition.width }}
              >
                <div className="border-b border-line px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink">Choose how Autobot thinks</p>
                  <p className="mt-0.5 text-[0.68rem] text-muted">
                    {byokActive ? "Your active browser key overrides platform modes." : "Change this anytime before sending."}
                  </p>
                </div>
                <div className="p-1.5">
                  {CHAT_MODES.map((item) => (
                    <Button
                      key={item.value}
                      role="menuitemradio"
                      aria-checked={mode === item.value}
                      disabled={byokActive && item.value !== "byok"}
                      onClick={() => {
                        if (!byokActive) setMode(item.value);
                        setModeMenuOpen(false);
                      }}
                      variant="ghost"
                      size="none"
                      className={cn("chat-mode-option h-auto", mode === item.value && "chat-mode-option-active")}
                    >
                      <span className="chat-mode-option-icon"><item.icon aria-hidden="true" className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-[0.68rem] leading-4 text-muted">{item.description}</span>
                      </span>
                      {mode === item.value ? <Check aria-hidden="true" className="size-4 shrink-0 text-forest" /> : null}
                    </Button>
                  ))}
                </div>
              </div>,
              document.body,
            ) : null}
          </div>
          <Button asChild variant="ghost" size="icon-sm">
            <Link
              href="/dashboard/settings#ai-and-data"
              aria-label="Open AI and data settings"
              title="AI and data settings"
              className="hidden sm:inline-flex"
            >
              <Settings2 aria-hidden="true" className="size-4" />
            </Link>
          </Button>
          <div className="flex shrink-0 items-center gap-2 rounded-md px-1.5 text-xs font-semibold text-forest">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            <span className="hidden lg:inline">Auto-approve</span>
            <Switch
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
              aria-label="Toggle auto-approve"
              title={autoApprove ? "Auto-approve is on" : "Auto-approve is off"}
            />
          </div>
          <ComposerIntegrationStatuses integrations={integrations} />
        </div>
        <Button onClick={send} disabled={pending || !message.trim()} aria-label={pending ? "Autobot is working" : "Send message"} title={pending ? "Autobot is working" : "Send message"} size="icon">
          {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <SendHorizontal aria-hidden="true" className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function ComposerIntegrationStatuses({
  integrations,
}: {
  integrations: IntegrationStatuses;
}) {
  const items = [
    {
      id: "gmail",
      label: "Gmail",
      connected: integrations.gmail === "connected",
      icon: Mail,
    },
    {
      id: "googlecalendar",
      label: "Google Calendar",
      connected: integrations.googlecalendar === "connected",
      icon: CalendarDays,
    },
  ] as const;

  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      role="group"
      aria-label="Connected apps"
    >
      {items.map(({ id, label, connected, icon: Icon }) => {
        const status = connected
          ? "connected"
          : integrations[id] === "error"
            ? "connection needs attention"
            : "not connected";

        return (
          <Button
            key={id}
            asChild
            variant="ghost"
            size="icon-sm"
            className={cn(
              "relative border",
              connected
                ? "border-success/30 bg-success-soft text-success hover:border-success/50 hover:bg-success-soft hover:text-success"
                : "border-line bg-surface-soft text-muted hover:border-red-700/30 hover:bg-red-700/10 hover:text-red-700 dark:hover:text-red-400",
            )}
          >
            <Link
              href="/dashboard/settings"
              aria-label={`${label}: ${status}. Open connected apps.`}
              title={`${label}: ${status}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full border border-surface",
                  connected
                    ? "bg-success text-white"
                    : "bg-red-700 text-white dark:bg-red-500",
                )}
              >
                {connected ? (
                  <Check className="size-2.5 stroke-[3]" />
                ) : (
                  <X className="size-2.5 stroke-[3]" />
                )}
              </span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

const CHAT_MODES = [
  { value: "auto", label: "Auto", description: "Best available mode, with automatic fallback.", icon: Bot },
  { value: "premium", label: "Premium", description: "Use your daily premium message allowance.", icon: Zap },
  { value: "free", label: "Free", description: "Use an available OpenRouter free model.", icon: Gift },
  { value: "byok", label: "My API key", description: "Use the provider key saved in this browser.", icon: KeyRound },
] satisfies { value: ChatMode; label: string; description: string; icon: typeof Bot }[];

function AutobotSignal() {
  return (
    <div className="autobot-signal" aria-hidden="true">
      <span className="autobot-signal-halo" />
      <span className="autobot-signal-orbit autobot-signal-orbit-mail"><Mail className="size-4" /></span>
      <span className="autobot-signal-orbit autobot-signal-orbit-calendar"><CalendarDays className="size-4" /></span>
      <span className="autobot-signal-core"><Bot className="size-8" /></span>
    </div>
  );
}
