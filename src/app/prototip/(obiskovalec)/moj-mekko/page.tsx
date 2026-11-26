import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, BookOpen, ChevronRight, Eye, LayoutDashboard, Settings, Sparkles } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { PrototypeAction } from "@/components/prototype-action";

export const metadata: Metadata = { title: "Moj Mekko" };

const items = [
  { Icon: Bookmark, label: "Shranjeno", desc: "Dogodki in ideje, ki si jih shranila", m: "M2" },
  { Icon: BookOpen, label: "Knjižnica", desc: "Kupljena navodila in tečaji", m: "M4" },
  { Icon: Sparkles, label: "Zanimanja in lokacija", desc: "Kaj ti prikazujemo v odkrivanju", m: "M1" },
  { Icon: Eye, label: "Zasebnost profila", desc: "Kdo vidi tvoj profil in aktivnosti", m: "M1" },
  {
    Icon: Settings,
    label: "Nastavitve in obvestila",
    desc: "E-pošta, opomniki, marketinška soglasja",
    m: "M1",
  },
];

export default function MojMekkoPage() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Moj Mekko</h1>

      <section className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-card)]">
        <Cover tone="coral" className="size-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">Nina N.</p>
          <p className="text-sm text-ink-muted">@nina · Ljubljana</p>
          <Badge tone="sage" className="mt-1">
            Profil: viden samo prijavljenim
          </Badge>
        </div>
      </section>

      <Link
        href="/prototip/organizator"
        className="flex items-center gap-4 rounded-[var(--radius-card)] bg-ink p-4 text-cream"
        data-testid="switch-organizer"
      >
        <LayoutDashboard aria-hidden="true" className="size-6 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Preklopi v način organizatorja</span>
          <span className="block text-sm opacity-80">Glinena hiša in še 1 prostor</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>

      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
        {items.map(({ Icon, label, desc, m }) => (
          <li key={label} className="flex items-center gap-4 p-4">
            <Icon aria-hidden="true" className="size-6 shrink-0 text-ink-muted" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-ink-muted">{desc}</span>
            </span>
            <Badge>Kmalu · {m}</Badge>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row">
        <PrototypeAction
          variant="secondary"
          explanation="izvoz podatkov in izbris računa (GDPR) prideta v M1."
        >
          Moji podatki in izbris računa
        </PrototypeAction>
        <PrototypeAction variant="ghost" explanation="odjava pride z avtentikacijo v M1.">
          Odjava
        </PrototypeAction>
      </div>
    </div>
  );
}
