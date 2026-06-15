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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { getLocalByokCredential } from "@/components/chat/byok-storage";
import {
  type ActionChatCard,
  type CalendarChatCard,
  type ChatCard,
  type ChatStreamEvent,
  type EmailChatCard,
  readChatCards,
} from "@/lib/ai/chat-cards";

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
  const [messages, setMessages] = useState(() => initialMessages.map((item) => ({
    ...item,
    cards: readChatCards(item.metadata),
  })));
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<ChatMode>("auto");
  const [autoApprove, setAutoApprove] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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

  async function send() {
    const content = message.trim();
    if (!content || pending) return;
    setMessage("");
    setError("");
    const byok = mode === "byok" ? getLocalByokCredential(byokStorageKey) : undefined;
    if (mode === "byok" && !byok) {
      setMessage(content);
      setError("Add an OpenAI or OpenRouter key in AI settings first.");
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
        body: JSON.stringify({ conversationId: activeId, message: content, mode, byok, autoApprove }),
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
    setMessages((current) => current.map((item) => ({
      ...item,
      cards: item.cards?.map((card) => card.kind === "action" && card.id === cardId
        ? { ...card, status, approvalUrl: null }
        : card),
    })));
  }

  return (
    <div className="grid min-h-[calc(100svh-8.5rem)] gap-3 md:h-[calc(100svh-8.5rem)] md:min-h-0 md:grid-cols-[minmax(0,1fr)_15rem] md:overflow-hidden lg:h-full lg:grid-cols-[minmax(0,1fr)_17rem]">
      <section className="product-panel flex min-h-[40rem] min-w-0 flex-col overflow-hidden md:min-h-0">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{conversations.find((item) => item.id === activeId)?.title ?? "Autobot Chat"}</p>
            <p className="text-xs text-muted">{pending ? "Autobot is working..." : "Ready for your next command"}</p>
          </div>
          <Link href="/dashboard/settings/ai" aria-label="Open AI settings" title="AI settings" className="product-icon-button grid size-10 shrink-0 place-items-center">
            <Settings2 aria-hidden="true" className="size-4" />
          </Link>
        </header>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7 ${messages.length === 0 ? "flex flex-col" : "space-y-4"}`}>
          {approvals.map((approval) => <PendingApprovalCard key={approval.token} token={approval.token} title={`${approval.plugin}: ${approval.endpoint}`} />)}
          {messages.length === 0 ? (
            <EmptyChat
              userName={userName}
              plan={plan}
              message={message}
              setMessage={setMessage}
              mode={mode}
              setMode={setMode}
              autoApprove={autoApprove}
              setAutoApprove={setAutoApprove}
              pending={pending}
              send={send}
              textareaRef={textareaRef}
              integrations={integrations}
            />
          ) : messages.map((item) => (
            <div key={item.id} className={item.role === "user" ? "ml-auto max-w-[80%]" : "max-w-[88%]"}>
              <div className={item.role === "user" ? "rounded-2xl bg-forest px-4 py-3 text-sm leading-6 text-white" : "rounded-2xl bg-surface-soft px-4 py-3 text-sm leading-6 text-ink"}>
                {item.content || (pending ? "Thinking..." : "")}
              </div>
              {item.role === "assistant" && item.cards?.length ? <ChatCards cards={item.cards} onActionStatus={updateActionCard} /> : null}
            </div>
          ))}
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        </div>
        {messages.length > 0 ? <div className="shrink-0 border-t border-line bg-surface p-4">
          <IntegrationConnectionNotice integrations={integrations} />
          <ChatComposer message={message} setMessage={setMessage} mode={mode} setMode={setMode} autoApprove={autoApprove} setAutoApprove={setAutoApprove} pending={pending} send={send} textareaRef={textareaRef} />
        </div> : null}
      </section>

      <aside className="product-panel flex min-h-0 flex-col overflow-hidden p-3 md:h-full">
        <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-sm font-semibold text-ink">Conversations</p>
            <p className="mt-0.5 text-xs text-muted">{conversations.length} saved</p>
          </div>
          <button
            type="button"
            onClick={createNew}
            disabled={pending}
            aria-label="Create new conversation"
            title="Create new conversation"
            className="product-button-primary grid size-10 shrink-0 place-items-center"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain border-y border-line py-2">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={`/dashboard/chat?conversation=${conversation.id}`}
              aria-current={conversation.id === activeId ? "page" : undefined}
              className={`block truncate rounded-lg px-3 py-2.5 text-sm font-medium transition ${conversation.id === activeId ? "dashboard-nav-active" : "text-muted hover:bg-surface-soft hover:text-forest"}`}>
              {conversation.title}
            </Link>
          ))}
        </div>

        <div className="shrink-0 pt-3">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={renameActive}
              aria-label="Rename conversation"
              title="Rename conversation"
              className="product-icon-button grid size-10 place-items-center"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={deleteActive}
              aria-label="Delete conversation"
              title="Delete conversation"
              className="product-icon-button chat-icon-danger grid size-10 place-items-center"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mt-3 rounded-xl bg-surface-soft p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{plan.name}</span><span>{plan.used}/{plan.limit}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-forest" style={{ width: `${Math.min((plan.used / plan.limit) * 100, 100)}%` }} />
            </div>
            <Link href="/dashboard/upgrade" className="mt-3 block text-xs font-semibold text-forest">View plans</Link>
          </div>
        </div>
      </aside>
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
      href={`/dashboard/inbox/thread/${encodeURIComponent(card.threadId)}`}
      className="group rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-forest-soft text-forest">
          <Mail aria-hidden="true" className="size-4" />
        </div>
        <span className="text-[0.68rem] font-semibold text-muted">{formatCardDate(card.receivedAt)}</span>
      </div>
      <p className="mt-3 truncate text-xs font-medium text-muted">{card.from ?? "Unknown sender"}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{card.subject ?? "No subject"}</p>
      {card.snippet ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{card.snippet}</p> : null}
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-forest">
        <span>{card.unread ? "Unread" : "Email"}</span>
        <ExternalLink aria-hidden="true" className="size-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function CalendarCard({ card }: { card: CalendarChatCard }) {
  return (
    <Link
      href={`/dashboard/calendar/event/${encodeURIComponent(card.id)}`}
      className="group rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-sm"
    >
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
        <ExternalLink aria-hidden="true" className="size-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function ActionCard({ card, onStatus }: { card: ActionChatCard; onStatus: (status: ActionChatCard["status"]) => void }) {
  const token = card.approvalUrl?.match(/\/dashboard\/approvals\/([A-Za-z0-9_-]+)/)?.[1];
  const content = (
    <div className="rounded-xl border border-gold/40 bg-gold-soft p-4 transition hover:border-gold">
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
    </div>
  );
  return content;
}

function PendingApprovalCard({ token, title }: { token: string; title: string }) {
  const [status, setStatus] = useState<ActionChatCard["status"]>("pending");
  if (status !== "pending") return null;
  return <div className="rounded-xl border border-gold/40 bg-gold-soft p-4"><p className="text-xs font-semibold uppercase tracking-wider text-forest">Approval needed</p><p className="mt-1 text-sm font-semibold text-ink">{title}</p><InlineApprovalControls token={token} onStatus={setStatus} /></div>;
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
  return <div className="mt-3 flex gap-2"><button type="button" disabled={working} onClick={() => decide("approve")} className="product-button-primary h-9 min-h-0 px-3 text-xs disabled:opacity-60">Approve and run</button><button type="button" disabled={working} onClick={() => decide("deny")} className="product-button-secondary h-9 min-h-0 px-3 text-xs disabled:opacity-60">Deny</button></div>;
}

function formatActionStatus(status: ActionChatCard["status"]) {
  return status === "pending" ? "Approval needed" : status === "completed" ? "Completed" : status === "denied" ? "Denied" : "Failed";
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
  message,
  setMessage,
  mode,
  setMode,
  autoApprove,
  setAutoApprove,
  pending,
  send,
  textareaRef,
  integrations,
}: {
  userName: string;
  plan: { name: string; used: number; limit: number; remaining: number };
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  autoApprove: boolean;
  setAutoApprove: (value: boolean) => void;
  pending: boolean;
  send: () => Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  integrations: IntegrationStatuses;
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

    <div className="mt-8 text-left">
      <IntegrationConnectionNotice integrations={integrations} />
      <ChatComposer message={message} setMessage={setMessage} mode={mode} setMode={setMode} autoApprove={autoApprove} setAutoApprove={setAutoApprove} pending={pending} send={send} textareaRef={textareaRef} featured />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {prompts.map(({ label, prompt, icon: Icon }) => (
          <button key={label} type="button" onClick={() => setMessage(prompt)} className="chat-prompt-chip">
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
      <UsageIndicator plan={plan} mode={mode} />
    </div>
  </div>;
}

const CONNECTION_NOTICE_CHANGE_EVENT = "autobot-chat-connection-notice-change";
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
    <div
      role="status"
      className="mb-3 flex items-start gap-3 rounded-lg border border-gold/40 bg-gold-soft px-3 py-2.5 text-sm text-ink"
    >
      <p className="min-w-0 flex-1 leading-5">
        {message}{" "}
        <Link
          href="/dashboard/settings"
          className="font-semibold text-forest underline underline-offset-2"
        >
          Connect apps
        </Link>
      </p>
      <button
        type="button"
        onClick={() => dismissConnectionNotice(storageKey)}
        aria-label="Dismiss connection notice"
        title="Dismiss notice"
        className="grid size-8 shrink-0 place-items-center rounded-md text-forest transition hover:bg-forest/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
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
  const freeActive = mode === "free" || (mode === "auto" && plan.remaining === 0);
  const ratio = plan.limit > 0 ? plan.remaining / plan.limit : 0;
  const tone = ratio > 0.5 ? "healthy" : ratio > 0.2 ? "warning" : "critical";
  const label = freeActive
    ? "Free model active. Messages do not use your premium allowance."
    : `${plan.remaining} of ${plan.limit} premium messages remain until 00:00 UTC.`;

  return (
    <div className="chat-usage-wrap">
      <div className={`chat-usage-indicator ${freeActive ? "chat-usage-free" : `chat-usage-${tone}`}`} tabIndex={0} aria-label={label}>
        {freeActive ? <InfinityIcon aria-hidden="true" className="size-4" /> : <span>{plan.remaining}/{plan.limit}</span>}
        <span className="chat-usage-tooltip" role="tooltip">{label}</span>
      </div>
    </div>
  );
}

function ChatComposer({
  message,
  setMessage,
  mode,
  setMode,
  autoApprove,
  setAutoApprove,
  pending,
  send,
  textareaRef,
  featured = false,
}: {
  message: string;
  setMessage: (message: string) => void;
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  autoApprove: boolean;
  setAutoApprove: (value: boolean) => void;
  pending: boolean;
  send: () => Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  featured?: boolean;
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
    <div className={featured ? "chat-composer chat-composer-featured" : "chat-composer"}>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
        rows={1}
        placeholder="Ask Autobot about your email or calendar..."
        className="max-h-[16rem] min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-muted"
      />
      <div className="flex items-center justify-between gap-3 border-t border-line px-2 py-2">
        <div className="flex min-w-0 items-center gap-1">
          <div className="relative shrink-0">
            <button
              ref={modeTriggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={modeMenuOpen}
              onClick={() => setModeMenuOpen((open) => !open)}
              className="chat-mode-trigger"
            >
              <SelectedModeIcon aria-hidden="true" className="size-3.5" />
              <span className="truncate">{selectedMode.label}</span>
              <ChevronDown aria-hidden="true" className={`size-3.5 transition-transform ${modeMenuOpen ? "rotate-180" : ""}`} />
            </button>
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
                  <p className="mt-0.5 text-[0.68rem] text-muted">Change this anytime before sending.</p>
                </div>
                <div className="p-1.5">
                  {CHAT_MODES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={mode === item.value}
                      onClick={() => {
                        setMode(item.value);
                        setModeMenuOpen(false);
                      }}
                      className={`chat-mode-option ${mode === item.value ? "chat-mode-option-active" : ""}`}
                    >
                      <span className="chat-mode-option-icon"><item.icon aria-hidden="true" className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-ink">{item.label}</span>
                        <span className="mt-0.5 block text-[0.68rem] leading-4 text-muted">{item.description}</span>
                      </span>
                      {mode === item.value ? <Check aria-hidden="true" className="size-4 shrink-0 text-forest" /> : null}
                    </button>
                  ))}
                </div>
              </div>,
              document.body,
            ) : null}
          </div>
          <Link href="/dashboard/settings/ai" aria-label="Open AI settings" title="AI settings" className="chat-composer-icon">
            <Settings2 aria-hidden="true" className="size-4" />
          </Link>
          <button
            type="button"
            role="switch"
            aria-checked={autoApprove}
            onClick={() => setAutoApprove(!autoApprove)}
            title={autoApprove ? "Auto-approve is on" : "Auto-approve is off"}
            className={`chat-mode-trigger ${autoApprove ? "bg-forest-soft text-forest" : ""}`}
          >
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            <span>Auto-approve</span>
            <span className={`h-4 w-7 rounded-full p-0.5 transition ${autoApprove ? "bg-forest" : "bg-line"}`}><span className={`block size-3 rounded-full bg-white transition-transform ${autoApprove ? "translate-x-3" : ""}`} /></span>
          </button>
        </div>
        <button type="button" onClick={send} disabled={pending || !message.trim()} aria-label={pending ? "Autobot is working" : "Send message"} title={pending ? "Autobot is working" : "Send message"} className="product-button-primary grid size-10 shrink-0 place-items-center rounded-full">
          {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <SendHorizontal aria-hidden="true" className="size-4" />}
        </button>
      </div>
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
