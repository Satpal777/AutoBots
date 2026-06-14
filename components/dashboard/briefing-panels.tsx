import Link from "next/link";

import {
  ArrowRightIcon,
  CalendarIcon,
  FlagIcon,
  MailIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { DailyBriefing } from "@/server/daily-briefing";
import type { MeetingPreparation } from "@/server/meeting-preparation";

export function DailyBriefingPanel({ briefing }: { briefing: DailyBriefing }) {
  return (
    <section className="product-panel mt-8 overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-forest">
            <SparklesIcon className="size-4" />
            Daily briefing
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
            What deserves attention today
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <BriefingStat label="High priority" value={briefing.highPriorityCount} />
          <BriefingStat label="Follow-ups" value={briefing.followUpCount} />
          <BriefingStat label="Events today" value={briefing.todayEventCount} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-ink">Inbox attention</p>
          {briefing.attentionItems.length > 0 ? (
            <div className="mt-3 divide-y divide-line">
              {briefing.attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group flex items-start gap-3 py-4 first:pt-2"
                >
                  <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                    item.kind === "priority"
                      ? "bg-gold-soft text-forest"
                      : "bg-success-soft text-success"
                  }`}>
                    {item.kind === "priority" ? <FlagIcon className="size-4" /> : <MailIcon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">{item.detail}</span>
                  </span>
                  <ArrowRightIcon className="mt-2 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-surface-soft p-4 text-sm text-muted">
              No high-priority messages or follow-ups need attention.
            </p>
          )}
        </div>

        <div className="border-t border-line bg-surface-soft p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarIcon className="size-4 text-forest" />
            Next meeting
          </p>
          {briefing.nextEvent ? (
            <div className="mt-4">
              <p className="text-lg font-semibold tracking-[-0.02em] text-ink">{briefing.nextEvent.title}</p>
              <p className="mt-2 text-sm text-muted">{formatBriefingTime(briefing.nextEvent.startsAt, briefing.nextEvent.allDay)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <UsersIcon className="size-3.5" />
                {briefing.nextEvent.attendeeCount} attendee{briefing.nextEvent.attendeeCount === 1 ? "" : "s"}
              </p>
              <Link
                href={`/dashboard/calendar/event/${encodeURIComponent(briefing.nextEvent.id)}#meeting-prep`}
                className="product-button-secondary mt-5 inline-flex items-center gap-2 px-4"
              >
                Prepare for meeting
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">No meetings remain today.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function MeetingPreparationPanel({ preparation }: { preparation: MeetingPreparation }) {
  return (
    <section id="meeting-prep" className="product-panel mt-6 scroll-mt-24 overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest">
          <SparklesIcon className="size-4" />
          Meeting preparation
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink">
          Context before the conversation
        </h2>
      </div>

      <div className="grid lg:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-line bg-surface-soft p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-ink">Attendees</p>
          <div className="mt-3 space-y-3">
            {preparation.externalAttendees.length > 0 ? preparation.externalAttendees.map((attendee) => (
              <div key={attendee.email} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-forest">
                  {(attendee.displayName ?? attendee.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{attendee.displayName ?? attendee.email}</p>
                  <p className="truncate text-xs text-muted">{attendee.responseStatus ?? "Response unknown"}</p>
                </div>
              </div>
            )) : <p className="text-sm text-muted">No external attendees are listed.</p>}
          </div>

          {preparation.talkingPoints.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">Suggested talking points</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                {preparation.talkingPoints.map((point) => <li key={point}>• {point}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-ink">Related workspace context</p>
          {preparation.relatedItems.length > 0 ? (
            <div className="mt-3 divide-y divide-line">
              {preparation.relatedItems.map((item) => (
                <Link key={item.id} href={item.href} className="group flex items-start gap-3 py-4 first:pt-2">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-soft text-forest">
                    <MailIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
                      {item.priority === "high" ? <span className="rounded-md bg-gold-soft px-1.5 py-0.5 text-[0.68rem] font-semibold text-forest">Priority</span> : null}
                      {item.needsFollowUp ? <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[0.68rem] font-semibold text-success">Follow-up</span> : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted">{item.preview || "Open related item"}</span>
                  </span>
                  <ArrowRightIcon className="mt-2 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-forest" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-surface-soft p-4 text-sm leading-6 text-muted">
              No related emails or calendar context were found in the local cache.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BriefingStat({ label, value }: { label: string; value: number }) {
  return <span className="rounded-lg bg-surface-soft px-2.5 py-1.5 text-muted">{value} {label}</span>;
}

function formatBriefingTime(value: string | null, allDay: boolean) {
  if (!value) return "Time unavailable";
  if (allDay) return `${value} · All day`;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
