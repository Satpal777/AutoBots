import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export function LegalDocument({
  title,
  summary,
  effectiveDate,
  sections,
}: LegalDocumentProps) {
  return (
    <main>
      <header className="legal-hero">
        <div className="site-shell py-14 sm:py-20">
          <p className="text-sm font-semibold text-gold-soft">Autobot legal</p>
          <h1 className="text-balance mt-4 max-w-4xl font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.04em] text-white">
            {title}
          </h1>
          <p className="text-pretty mt-6 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
            {summary}
          </p>
          <p className="mt-7 text-xs font-semibold text-gold-soft">
            Effective and last updated: {effectiveDate}
          </p>
        </div>
      </header>

      <div className="site-shell grid gap-10 py-10 sm:py-14 lg:grid-cols-[15rem_minmax(0,47rem)] lg:items-start lg:gap-16 lg:py-20">
        <aside className="lg:sticky lg:top-24">
          <details className="legal-mobile-toc lg:hidden">
            <summary>On this page</summary>
            <TableOfContents sections={sections} />
          </details>

          <nav
            aria-label={`${title} table of contents`}
            className="hidden lg:block"
          >
            <p className="text-xs font-semibold text-muted">On this page</p>
            <TableOfContents sections={sections} />
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="legal-review-note">
            <strong>Plain-English legal starter.</strong> This document describes
            the current Autobot service and should be reviewed by qualified
            legal counsel before being relied on for a specific jurisdiction.
          </div>

          <div className="legal-prose mt-10">
            {sections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                className="scroll-mt-28 border-t border-line py-9 first:border-t-0 first:pt-0"
              >
                <h2>{section.title}</h2>
                <div>{section.content}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

function TableOfContents({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="mt-4 space-y-1.5">
      {sections.map((section, index) => (
        <li key={section.id}>
          <a
            className="legal-toc-link"
            href={`#${section.id}`}
          >
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
