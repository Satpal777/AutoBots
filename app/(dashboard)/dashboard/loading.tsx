export default function DashboardLoading() {
  return (
    <div aria-label="Loading section" aria-busy="true">
      <div className="h-4 w-20 animate-pulse rounded bg-line" />
      <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded bg-line" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-line" />

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="product-panel h-80 animate-pulse" />
        <div className="product-panel-muted h-80 animate-pulse" />
      </div>
    </div>
  );
}
