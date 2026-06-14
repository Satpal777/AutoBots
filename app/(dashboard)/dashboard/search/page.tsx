import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/dashboard/workspace-panels";
import { SearchIcon } from "@/components/ui/icons";
import { requireSession } from "@/lib/auth/session";
import { searchWorkspace } from "@/server/intelligence";
import { correctIntelligenceAction } from "./actions";

const QuerySchema = z.string().trim().max(300);

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const value = (await searchParams).q;
  const parsed = QuerySchema.safeParse(Array.isArray(value) ? value[0] : value);
  const query = parsed.success ? parsed.data : "";
  const results = query ? await searchWorkspace(session.user.id, query) : [];

  return (
    <>
      <PageHeader label="Search" title="Search your workspace" description="Find cached email and calendar details from one place." />
      <form action="/dashboard/search" className="product-input mt-7 flex max-w-3xl overflow-hidden">
        <input autoFocus name="q" defaultValue={query} placeholder="Search people, topics, meetings, or details..." className="min-w-0 flex-1 bg-transparent px-4 text-sm text-ink outline-none" />
        <button type="submit" aria-label="Search workspace" className="grid size-11 place-items-center text-forest"><SearchIcon className="size-4" /></button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/dashboard/search?q=priority%3Ahigh" className="product-button-secondary inline-flex items-center px-3">High priority</Link>
        <Link href="/dashboard/search?q=is%3Afollowup" className="product-button-secondary inline-flex items-center px-3">Needs follow-up</Link>
        <Link href="/dashboard/search?q=priority%3Alow" className="product-button-secondary inline-flex items-center px-3">Low priority</Link>
      </div>
      <section className="product-panel mt-7 divide-y divide-line overflow-hidden">
        {results.map((result) => (
          <article key={result.id} className="p-5 transition hover:bg-surface-soft">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-forest">{result.entityType}</span>
              {result.priority ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold text-forest">{result.priority}</span> : null}
              {result.needsFollowUp ? <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-ink">Follow up</span> : null}
            </div>
            <Link href={result.href} className="mt-2 block text-sm font-semibold text-ink hover:text-forest">{result.title}</Link>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{result.summary ?? result.preview}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={correctIntelligenceAction} className="flex items-center gap-2">
                <input type="hidden" name="entityId" value={result.id} />
                <input type="hidden" name="needsFollowUp" value={result.needsFollowUp ? "true" : "false"} />
                <select name="priority" defaultValue={result.priority ?? "normal"} aria-label="Priority" className="product-input h-9 px-3 text-xs">
                  <option value="high">High priority</option>
                  <option value="normal">Normal priority</option>
                  <option value="low">Low priority</option>
                </select>
                <button type="submit" className="product-button-secondary inline-flex h-9 items-center px-3 text-xs">Save priority</button>
              </form>
              <form action={correctIntelligenceAction}>
                <input type="hidden" name="entityId" value={result.id} />
                <input type="hidden" name="priority" value={result.priority ?? "normal"} />
                <input type="hidden" name="needsFollowUp" value={result.needsFollowUp ? "false" : "true"} />
                <button type="submit" className="product-button-secondary inline-flex h-9 items-center px-3 text-xs">
                  {result.needsFollowUp ? "Clear follow-up" : "Mark follow-up"}
                </button>
              </form>
            </div>
          </article>
        ))}
        {query && results.length === 0 ? <p className="p-8 text-center text-sm text-muted">No local results found.</p> : null}
        {!query ? <p className="p-8 text-center text-sm text-muted">Search across your locally cached Gmail and Calendar data.</p> : null}
      </section>
    </>
  );
}
