import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { getMySpaces, requireUser } from "@/lib/auth/dal";
import { respondInvite } from "@/lib/actions/spaces";
import { PageSkeleton } from "@/components/page-skeleton";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roleLabel, spaceKindLabel } from "@/lib/spaces";

export const metadata: Metadata = { title: "Moji prostori" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Moji prostori" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const profile = await requireUser({ next: "/organizator" });
  const spaces = await getMySpaces();
  const active = spaces.filter((s) => s.status === "active");
  const invites = spaces.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Moji prostori</h1>
          <p className="text-ink-muted">Prostori so brezplačni. Ustvariš jih lahko več.</p>
        </div>
        {active.length > 0 && (
          <ButtonLink href="/organizator/nov-prostor">
            <Plus aria-hidden="true" className="size-5" /> Nov prostor
          </ButtonLink>
        )}
      </div>

      {invites.length > 0 && (
        <section className="space-y-2" aria-labelledby="invites-h">
          <h2 id="invites-h" className="font-display text-lg font-bold">
            Povabila v ekipo
          </h2>
          <ul className="space-y-2" data-testid="invites">
            {invites.map((s) => (
              <li
                key={s.space.id}
                className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-sun-soft p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.space.name}</p>
                  <p className="text-sm text-sun-ink">Vabilo za vlogo: {roleLabel[s.role]}</p>
                </div>
                <form action={respondInvite} className="flex gap-2">
                  <input type="hidden" name="space_id" value={s.space.id} />
                  <button
                    type="submit"
                    name="decision"
                    value="accept"
                    className={buttonClasses("primary", "md")}
                  >
                    Sprejmi
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="decline"
                    className={buttonClasses("secondary", "md")}
                  >
                    Zavrni
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
          <h2 className="font-display text-xl font-bold">Začni z lastnim prostorom</h2>
          <p className="text-ink-muted">
            Vsi tvoji dogodki in ekipa bodo pod prostorom. Za samostojne ustvarjalce priporočamo vrsto
            »Ustvarjalec«.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink
              href={`/organizator/nov-prostor?vrsta=solo_creator&ime=${encodeURIComponent(profile.display_name)}`}
            >
              Začni kot ustvarjalec
            </ButtonLink>
            <ButtonLink href="/organizator/nov-prostor" variant="secondary">
              Druga vrsta prostora
            </ButtonLink>
          </div>
        </section>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="my-spaces">
          {active.map((s) => (
            <li key={s.space.id}>
              <Link
                href={`/organizator/${s.space.slug}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold break-words">{s.space.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="lilac">{spaceKindLabel[s.space.kind]}</Badge>
                    <Badge>{roleLabel[s.role]}</Badge>
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
