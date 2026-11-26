import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { followAction } from "@/lib/actions/feed";
import { BackLink } from "@/components/back-link";
import { EmptyState, PageSkeleton } from "@/components/page-skeleton";
import { SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Poišči ljudi" };

export default function Page({ searchParams }: PageProps<"/feed/iskanje">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackLink href="/feed">Feed</BackLink>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Poišči ljudi</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/feed/iskanje">["searchParams"] }) {
  await requireUser({ next: "/feed/iskanje" });
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const supabase = await createClient();
  const { data: people } =
    q.trim().length >= 2 ? await supabase.rpc("search_people", { p_query: q }) : { data: [] };
  const back = `/feed/iskanje?q=${encodeURIComponent(q)}`;

  return (
    <div className="space-y-4">
      <form role="search" action="/feed/iskanje" className="relative">
        <label htmlFor="q" className="sr-only">
          Ime ali uporabniško ime
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ime ali @uporabnik"
          className="min-h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base placeholder:text-ink-muted"
        />
      </form>
      {q.trim().length < 2 ? (
        <p className="text-sm text-ink-muted">Vpiši vsaj 2 znaka.</p>
      ) : (people ?? []).length === 0 ? (
        <EmptyState title="Ni zadetkov" />
      ) : (
        <ul
          className="divide-y divide-line rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]"
          data-testid="people"
        >
          {(people ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3">
              <Link href={`/u/${p.handle}`} className="min-w-0 hover:underline">
                <span className="block truncate font-semibold">{p.display_name}</span>
                <span className="block text-sm text-ink-muted">@{p.handle}</span>
              </Link>
              {!p.is_me && (
                <form action={followAction}>
                  <input type="hidden" name="profile_id" value={p.id} />
                  <input type="hidden" name="handle" value={p.handle} />
                  <input type="hidden" name="back" value={back} />
                  <input type="hidden" name="follow" value={p.follow_status ? "0" : "1"} />
                  <SubmitButton size="sm" variant={p.follow_status ? "secondary" : "primary"} pendingText="…">
                    {p.follow_status === "active"
                      ? "Slediš ✓"
                      : p.follow_status === "pending"
                        ? "Prošnja poslana"
                        : "Sledi"}
                    <span className="sr-only"> – {p.display_name}</span>
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
