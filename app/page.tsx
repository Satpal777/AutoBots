import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AutobotLogo } from "@/components/brand/autobot-logo";
import { FloatingNav } from "@/components/landing/floating-nav";
import { ScrollMotion } from "@/components/landing/scroll-motion";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CommandIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard/chat");
  }

  return (
    <main className="landing-page overflow-hidden bg-canvas">
      <ScrollMotion />
      <Hero />
      <StoryPrelude />
      <InboxStory />
      <CalendarStory />
      <SecurityStory />
      <CommandCenter />
      <Closing />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section className="landing-hero relative min-h-[100svh] overflow-hidden bg-canvas">
      <Image
        src="/illustrations/autobot-hero.png"
        alt=""
        fill
        preload
        sizes="100vw"
        className="landing-hero-image object-cover object-[68%_center]"
      />
      <div className="hero-veil absolute inset-0" />
      <FloatingNav />

      <div className="site-shell relative z-10 flex min-h-[100svh] flex-col justify-end pb-10 pt-28 sm:pb-12 sm:pt-32 lg:justify-center lg:pb-16 lg:pt-28">
        <div className="hero-copy-enter max-w-2xl">
          <p className="flex items-center gap-3 text-sm font-bold text-forest">
            <span className="h-px w-9 bg-gold" />
            Gmail and Calendar, ready to ask
          </p>
          <h1 className="text-balance mt-5 font-display text-[clamp(3.45rem,7vw,6rem)] leading-[0.94] tracking-[-0.04em] text-ink">
            AskBots keeps your workday clear.
          </h1>
          <p className="text-pretty mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Search your workspace, draft replies, and find time across Gmail
            and Google Calendar.
          </p>
          <Link
            href="/dashboard/chat"
            className="landing-hero-action product-button-primary mt-8 inline-flex items-center gap-2 px-5"
          >
            AskBots
            <ArrowRightIcon className="size-4" />
          </Link>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted">
            <ShieldIcon className="size-4 text-forest" />
            You stay in control of write actions.
          </p>
        </div>
      </div>
    </section>
  );
}

function StoryPrelude() {
  return (
    <section id="story" className="anchor-section relative bg-ink text-white">
      <div className="absolute -left-24 top-16 size-72 rounded-full bg-forest opacity-45 blur-3xl" />
      <div className="site-shell section-space grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
        <div className="motion-reveal">
          <p className="text-sm font-semibold text-gold">
            A clearer daily route
          </p>
          <p className="text-pretty mt-4 max-w-xs text-sm leading-6 text-white/65">
            See what needs attention, then ask for the next useful step.
          </p>
        </div>
        <h2 className="motion-reveal text-balance font-display text-[clamp(3rem,5.5vw,5.5rem)] leading-[1] tracking-[-0.04em]">
          Your inbox, calendar, and AskBots, moving together.
        </h2>
      </div>
    </section>
  );
}

function InboxStory() {
  return (
    <section className="section-space relative">
      <div className="site-shell grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
        <div className="motion-story-card relative" data-motion-direction="-1">
          <div className="absolute -left-8 -top-8 size-32 rounded-[68%_32%_61%_39%] bg-gold-soft" />
          <div className="parallax-frame relative aspect-square rounded-2xl bg-surface shadow-soft">
            <Image
              src="/illustrations/autobot-inbox.png"
              alt="Autobot sorting incoming messages into clear paths"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="parallax-image object-cover"
            />
          </div>
          <div className="absolute -bottom-5 right-5 rounded-xl bg-forest p-4 text-white shadow-card sm:right-8">
            <MailIcon className="size-5 text-gold" />
            <p className="mt-3 text-sm font-semibold">The right message, first.</p>
          </div>
        </div>

        <div className="motion-reveal">
          <p className="text-sm font-semibold text-gold">The message room</p>
          <h2 className="text-balance mt-3 font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.02] tracking-[-0.04em] text-ink">
            Start with the messages that matter.
          </h2>
          <p className="text-pretty mt-5 max-w-lg text-base leading-7 text-muted">
            Review priorities, find follow-ups, compose replies, and manage
            Gmail drafts.
          </p>
          <div className="mt-8 grid max-w-lg gap-5 sm:grid-cols-2">
            <Detail icon={MailIcon} title="Priority in view">
              Start with high-attention and follow-up conversations.
            </Detail>
            <Detail icon={CommandIcon} title="Replies prepared">
              AskBots can prepare a response for your review.
            </Detail>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarStory() {
  return (
    <section className="section-space relative bg-forest text-white">
      <div className="absolute right-0 top-0 h-1/2 w-1/3 bg-white/4" />
      <div className="site-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
        <div className="motion-reveal relative z-10">
          <p className="text-sm font-semibold text-gold">The time garden</p>
          <h2 className="text-balance mt-3 font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.02] tracking-[-0.04em]">
            See the space between meetings.
          </h2>
          <p className="text-pretty mt-5 max-w-lg text-base leading-7 text-white/70">
            Review events, check availability, and prepare for upcoming
            meetings.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Upcoming events", "Meeting preparation", "Open time"].map(
              (item) => (
                <span
                  key={item}
                  className="rounded-full bg-white/8 px-3.5 py-2 text-xs font-semibold text-white/75"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="motion-story-card relative" data-motion-direction="1">
          <div className="absolute -right-10 -top-10 size-40 rounded-[35%_65%_44%_56%] bg-gold/30 blur-sm" />
          <div className="parallax-frame relative aspect-square rounded-2xl bg-surface shadow-soft">
            <Image
              src="/illustrations/autobot-calendar.png"
              alt="Autobot moving calendar blocks to make room in a busy schedule"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="parallax-image object-cover"
            />
          </div>
          <div className="absolute -bottom-5 left-5 inline-flex items-center gap-3 rounded-full bg-surface px-4 py-3 text-xs font-semibold text-forest shadow-card sm:left-10">
            <CalendarIcon className="size-4 text-gold" />
            Thursday, with room to think
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityStory() {
  return (
    <section id="security" className="anchor-section section-space relative">
      <div className="site-shell">
        <div className="motion-reveal mb-10 grid gap-4 lg:grid-cols-[0.65fr_1.35fr] lg:items-end lg:gap-16">
          <p className="text-sm font-semibold text-gold">The key room</p>
          <h2 className="text-balance font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.02] tracking-[-0.04em] text-ink">
            Useful access stays under your control.
          </h2>
        </div>

        <div
          className="motion-story-card grid overflow-hidden rounded-2xl bg-surface shadow-soft lg:grid-cols-[1.1fr_0.9fr]"
          data-motion-direction="-1"
        >
          <div className="parallax-frame relative min-h-[23rem] lg:min-h-[34rem]">
            <Image
              src="/illustrations/autobot-security.png"
              alt="Autobot securely separating email and calendar data into protected spaces"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="parallax-image object-cover"
            />
          </div>
          <div className="flex items-center bg-surface-soft p-7 sm:p-10 lg:p-12">
            <div>
              <ShieldIcon className="size-8 text-forest" />
              <h3 className="mt-6 font-display text-3xl leading-tight tracking-[-0.025em] text-ink sm:text-4xl">
                Every workspace keeps its own key.
              </h3>
              <p className="text-pretty mt-4 text-sm leading-6 text-muted">
                Gmail and Calendar permissions remain separate. Corsair
                encrypts each connection and scopes every request to your
                account.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Separate permission choices",
                  "Encrypted integration credentials",
                  "Tenant-isolated workspace data",
                  "Approval controls for write actions",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-ink">
                    <span className="grid size-6 place-items-center rounded-full bg-success-soft text-success">
                      <CheckIcon className="size-4" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandCenter() {
  return (
    <section id="command-center" className="anchor-section quiet-grid section-space">
      <div className="site-shell">
        <div className="motion-reveal mx-auto max-w-3xl text-center">
          <CommandIcon className="mx-auto size-8 text-gold" />
          <p className="mt-5 text-sm font-semibold text-forest">The command center</p>
          <h2 className="text-balance mt-3 font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.02] tracking-[-0.04em] text-ink">
            One place to begin the day.
          </h2>
          <p className="text-pretty mx-auto mt-4 max-w-xl leading-7 text-muted">
            Review your daily briefing, priority inbox, schedule, and
            connection health at a glance.
          </p>
        </div>

        <div className="motion-showcase relative mx-auto mt-12 max-w-6xl">
          <div className="absolute -left-10 top-20 hidden size-40 rounded-[40%_60%_64%_36%] bg-gold-soft lg:block" />
          <div className="absolute -right-8 bottom-16 hidden size-36 rounded-[63%_37%_42%_58%] bg-surface-soft lg:block" />
          <div className="relative rounded-2xl bg-ink p-2.5 shadow-soft sm:p-4">
            <div className="grid overflow-hidden rounded-xl bg-canvas lg:grid-cols-[14rem_1fr]">
              <aside className="bg-forest p-6 text-white">
                <AutobotLogo inverse />
                <nav className="mt-10 space-y-1 text-sm">
                  <p className="rounded-xl bg-white/12 px-3 py-3 font-semibold">Today</p>
                  <p className="px-3 py-3 text-white/55">AskBots</p>
                  <p className="px-3 py-3 text-white/55">Inbox</p>
                  <p className="px-3 py-3 text-white/55">Calendar</p>
                </nav>
                <div className="mt-12 rounded-xl bg-white/8 p-4">
                  <p className="text-xs text-white/50">Workspace health</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                    <span className="size-2 rounded-full bg-gold" />
                    All connected
                  </p>
                </div>
              </aside>

              <div className="p-5 sm:p-7 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gold">Daily briefing</p>
                    <h3 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                      Good morning, Alex.
                    </h3>
                  </div>
                  <span className="self-start rounded-full bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-card sm:self-auto">
                    Synced just now
                  </span>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                        <MailIcon className="size-4 text-forest" />
                        Needs your attention
                      </p>
                      <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-forest">
                        3
                      </span>
                    </div>
                    <div className="mt-6 space-y-5">
                      {[
                        ["Maya Chen", "Project notes and next steps", "8 min"],
                        ["Northstar Studio", "Updated proposal", "42 min"],
                        ["Liam", "Quick question before Thursday", "1 hr"],
                      ].map(([from, subject, time], index) => (
                        <div key={from} className={index ? "border-t border-line pt-5" : ""}>
                          <div className="flex items-center justify-between gap-4">
                            <p className="truncate text-xs font-semibold text-ink">{from}</p>
                            <span className="shrink-0 text-[0.65rem] text-muted">{time}</span>
                          </div>
                          <p className="mt-1.5 truncate text-xs text-muted">{subject}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface-soft p-5 sm:p-6">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <CalendarIcon className="size-4 text-forest" />
                      Coming up
                    </p>
                    <div className="mt-6 rounded-xl bg-surface p-4 shadow-card">
                      <p className="text-xs font-bold text-gold">10:30</p>
                      <p className="mt-2 text-sm font-semibold text-ink">Weekly planning</p>
                      <p className="mt-1 text-xs text-muted">30 minutes</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-forest p-4 text-white">
                      <p className="text-xs text-gold">Quiet window</p>
                      <p className="mt-2 text-sm font-semibold">1h 45m open</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="section-space">
      <div className="motion-reveal site-shell relative overflow-hidden rounded-2xl bg-forest px-6 py-16 text-center text-white shadow-soft sm:px-10 lg:py-20">
        <div className="absolute -left-14 -top-16 size-52 rounded-full bg-gold/25 blur-2xl" />
        <div className="absolute -bottom-20 right-0 size-60 rounded-full bg-white/8 blur-2xl" />
        <LockIcon className="relative mx-auto size-8 text-gold" />
        <h2 className="text-balance relative mx-auto mt-6 max-w-3xl font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.02] tracking-[-0.04em]">
          Ask once. Start the day with context.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl leading-7 text-white/70">
          Connect Gmail and Calendar, then let AskBots prepare the next useful
          step.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="site-shell flex flex-col gap-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AutobotLogo />
          <p className="mt-2 text-xs">
            Gmail and Calendar, arranged around your day.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-5 gap-y-3 font-semibold text-forest"
        >
          <Link className="hover:text-forest-hover" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-forest-hover" href="/tnc">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}

function Detail({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MailIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-forest" />
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{children}</p>
    </div>
  );
}
