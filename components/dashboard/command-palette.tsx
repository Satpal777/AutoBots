"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, MailIcon, PencilIcon, SearchIcon, SettingsIcon, SparklesIcon } from "@/components/ui/icons";

const commands = [
  { label: "Open Autobot Chat", keywords: "ai assistant", href: "/dashboard/chat", icon: SparklesIcon, shortcut: "G A" },
  { label: "Search inbox", keywords: "email gmail find priority follow up unread", href: "/dashboard/inbox", icon: SearchIcon, shortcut: "/" },
  { label: "Open inbox", keywords: "gmail mail", href: "/dashboard/inbox", icon: MailIcon, shortcut: "G I" },
  { label: "Compose email", keywords: "gmail send message", href: "/dashboard/inbox/compose", icon: PencilIcon, shortcut: "C" },
  { label: "Open calendar", keywords: "schedule events", href: "/dashboard/calendar", icon: CalendarIcon, shortcut: "G C" },
  { label: "Create calendar event", keywords: "meeting invite", href: "/dashboard/calendar/new", icon: CalendarIcon, shortcut: "N" },
  { label: "Open settings", keywords: "integrations preferences", href: "/dashboard/settings", icon: SettingsIcon, shortcut: "G S" },
] as const;

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sequence, setSequence] = useState("");
  const filtered = useMemo(() => commands.filter((command) =>
    `${command.label} ${command.keywords}`.toLowerCase().includes(query.toLowerCase()),
  ), [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "/" || key === "?") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      const next = sequence ? `${sequence} ${key}` : key;
      const command = commands.find((item) => item.shortcut.toLowerCase() === next);
      if (command) {
        event.preventDefault();
        router.push(command.href);
        setSequence("");
      } else {
        setSequence(key === "g" ? "g" : "");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, sequence]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-ink/30 p-4 pt-[15vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="product-panel mx-auto max-w-xl overflow-hidden shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center border-b border-line px-4">
          <SearchIcon className="size-4 text-muted" />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && filtered[0]) {
              router.push(filtered[0].href);
              setOpen(false);
            }
          }} placeholder="Type a command or search..." className="h-14 min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none" />
          <kbd className="rounded border border-line px-2 py-1 text-xs text-muted">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map(({ label, href, icon: Icon, shortcut }) => (
            <button key={href} type="button" onClick={() => { router.push(href); setOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink transition hover:bg-surface-soft">
              <Icon className="size-4 text-forest" /><span className="flex-1">{label}</span><kbd className="text-xs font-medium text-muted">{shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
