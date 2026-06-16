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
  const bodyFill = inverse ? "white" : "currentColor";
  const faceFill = inverse ? "var(--forest-solid)" : "var(--ink)";
  const chinStroke = inverse ? "white" : "currentColor";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="size-9 shrink-0"
      fill="none"
    >
      <rect
        x="8"
        y="11"
        width="32"
        height="30"
        rx="10"
        fill={bodyFill}
      />
      <path
        d="M24 11V7.5M21.5 7.5h5"
        stroke={bodyFill}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="14"
        y="19"
        width="20"
        height="13"
        rx="6.5"
        fill={faceFill}
      />
      <circle cx="20" cy="25.5" r="2" fill="var(--gold)" />
      <circle cx="28" cy="25.5" r="2" fill="var(--gold)" />
      <path
        d="M19 36h10"
        stroke={chinStroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
