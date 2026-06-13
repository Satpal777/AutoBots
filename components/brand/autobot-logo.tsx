import Link from "next/link";

export function AutobotLogo({
  inverse = false,
  showName = true,
}: {
  inverse?: boolean;
  showName?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Autobot home"
      className={`inline-flex items-center gap-2.5 font-semibold tracking-[-0.015em] ${
        inverse ? "text-white" : "text-forest"
      }`}
    >
      <AutobotMark inverse={inverse} />
      {showName ? <span>Autobot</span> : null}
    </Link>
  );
}

export function AutobotMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className="size-9 shrink-0"
      fill="none"
    >
      <rect
        x="2"
        y="4"
        width="36"
        height="32"
        rx="11"
        fill={inverse ? "white" : "currentColor"}
      />
      <path
        d="M20 4V1.75M17.75 1.75h4.5"
        stroke={inverse ? "white" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="11"
        width="24"
        height="17"
        rx="7.5"
        fill={inverse ? "var(--forest)" : "var(--gold-soft)"}
      />
      <circle cx="15.5" cy="19.5" r="2.25" fill="var(--gold)" />
      <circle cx="24.5" cy="19.5" r="2.25" fill="var(--gold)" />
      <path
        d="M15 31.5h10"
        stroke={inverse ? "var(--forest)" : "var(--gold-soft)"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
