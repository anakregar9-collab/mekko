import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarPlus, ChevronRight, Lightbulb, Store } from "lucide-react";
import { getMySpaces, requireUser } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Ustvari" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton title="Ustvari" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireUser({ next: "/ustvari" });
  const spaces = (await getMySpaces()).filter(
    (s) => s.status === "active" && (s.role === "owner" || s.role === "admin"),
  );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Ustvari</h1>
        <p className="mt-1 text-ink-muted">Kaj želiš deliti s skupnostjo?</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/organizator/nov-prostor"
            className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-sage-ink">
              <Store aria-hidden="true" className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold">Prostor</span>
              <span className="block text-sm text-ink-muted">Ustvarjalec, skupnost, studio ali društvo</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
          </Link>
        </li>
        <li>
          <Link
            href={
              spaces.length === 1
                ? `/organizator/${spaces[0].space.slug}/dogodki/nov`
                : spaces.length > 1
                  ? "/organizator"
                  : "/organizator/nov-prostor"
            }
            className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
              <CalendarPlus aria-hidden="true" className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold">Dogodek ali delavnica</span>
              <span className="block text-sm text-ink-muted">
                {spaces.length === 0
                  ? "Najprej ustvariš prostor (brezplačno)"
                  : "Enkratni dogodek ali tečaj z več srečanji"}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
          </Link>
        </li>
        <Soon
          icon={<Lightbulb aria-hidden="true" className="size-6" />}
          title="Ideja"
          when="M4"
          tone="bg-sun-soft text-sun-ink"
        />
      </ul>
    </div>
  );
}

function Soon({
  icon,
  title,
  when,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  when: string;
  tone: string;
}) {
  return (
    <li className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface/60 p-4 ring-1 ring-line">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold text-ink-muted">{title}</span>
        <span className="block text-sm text-ink-muted">Kmalu · predvideno v {when}</span>
      </span>
    </li>
  );
}
