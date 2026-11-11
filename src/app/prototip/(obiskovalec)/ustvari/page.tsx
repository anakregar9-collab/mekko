import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronRight, Lightbulb, PlayCircle, Store } from "lucide-react";
import { PrototypeAction } from "@/components/prototype-action";

export const metadata: Metadata = { title: "Ustvari" };

/**
 * Ustvari = one central creation menu (PRODUCT_SPEC §2). Ideas are open to every
 * registered user; events and spaces live in organizer mode, which any personal
 * account can switch on (docs/M0_REVIEW.md #5).
 */
export default function UstvariPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Ustvari</h1>
        <p className="mt-1 text-ink-muted">Kaj želiš deliti s skupnostjo?</p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/prototip/ustvari/dogodek"
            className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
          >
            <IconBubble className="bg-brand-soft text-brand-strong">
              <CalendarPlus aria-hidden="true" className="size-6" />
            </IconBubble>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold">Dogodek ali delavnica</span>
              <span className="block text-sm text-ink-muted">
                Enkratni, večkratni, ponavljajoči, online ali zasebni
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
          </Link>
        </li>
        <li className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4">
            <IconBubble className="bg-sun-soft text-sun-ink">
              <Lightbulb aria-hidden="true" className="size-6" />
            </IconBubble>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold">Ideja</span>
              <span className="block text-sm text-ink-muted">
                Foto z opisom, PDF navodila ali zunanji vodič
              </span>
            </span>
          </div>
          <PrototypeAction variant="secondary" size="sm" explanation="objava idej pride v M4.">
            Objavi idejo
          </PrototypeAction>
        </li>
        <li className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4">
            <IconBubble className="bg-sage-soft text-sage-ink">
              <Store aria-hidden="true" className="size-6" />
            </IconBubble>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold">Prostor</span>
              <span className="block text-sm text-ink-muted">Ustvarjalec, skupnost, studio ali društvo</span>
            </span>
          </div>
          <PrototypeAction variant="secondary" size="sm" explanation="ustvarjanje prostorov pride v M1.">
            Ustvari prostor
          </PrototypeAction>
        </li>
        <li className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface/60 p-4 ring-1 ring-line">
          <IconBubble className="bg-lilac-soft text-lilac-ink">
            <PlayCircle aria-hidden="true" className="size-6" />
          </IconBubble>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold text-ink-muted">Video tečaj</span>
            <span className="block text-sm text-ink-muted">Kmalu · predvideno v M5</span>
          </span>
        </li>
      </ul>
    </div>
  );
}

function IconBubble({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${className}`}>
      {children}
    </span>
  );
}
