import { redirect } from "next/navigation";

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const value = (await searchParams).q;
  const query = Array.isArray(value) ? value[0] : value;
  redirect(query ? `/dashboard/inbox?q=${encodeURIComponent(query)}` : "/dashboard/inbox");
}
