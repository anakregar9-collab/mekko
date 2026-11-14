import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

/**
 * M0 review hub. In M1+ the root becomes the real Odkrivanje feed;
 * until then it links to the clickable prototypes and design docs.
 */
const screens = [
  {
    group: "Obiskovalec (mobilno)",
    items: [
      { href: "/prototip/odkrivanje", label: "Odkrivanje", note: "feed, iskanje, kategorije" },
      {
        href: "/prototip/dogodki/keramika-za-zacetnike",
        label: "Podrobnosti dogodka",
        note: "preklop gost/prijavljen",
      },
      { href: "/prototip/dogodki/tecaj-pletenja", label: "Večkratni tečaj", note: "ena prijava, 4 srečanja" },
      { href: "/prototip/dogodki/svece-iz-sojinega-voska", label: "Zunanja prijava", note: "jasno označeno" },
      { href: "/prototip/moje-aktivnosti", label: "Moje aktivnosti", note: "seznam + koledar" },
      { href: "/prototip/ustvari", label: "Ustvari", note: "osrednji meni" },
      { href: "/prototip/ustvari/dogodek", label: "Ustvari dogodek", note: "4 koraki" },
      { href: "/prototip/moj-mekko", label: "Moj Mekko", note: "profil, preklop v organizatorja" },
      { href: "/prototip/sporocila", label: "Sporočila", note: "ikona v glavi" },
      { href: "/prototip/obvestila", label: "Obvestila", note: "ločena ikona" },
    ],
  },
  {
    group: "Delovna okolja (namizje)",
    items: [
      { href: "/prototip/organizator", label: "Nadzorna plošča organizatorja", note: "" },
      { href: "/prototip/admin", label: "Administracija platforme", note: "" },
    ],
  },
];

const docs = [
  ["docs/M0_REVIEW.md", "Stanje, nasprotja v specifikaciji, odločitve za potrditev"],
  ["docs/DOMAIN_MODEL.md", "Domenski model in ER diagram"],
  ["docs/ROUTES_AND_AUTHZ.md", "Zemljevid poti in matrika pravic"],
  ["docs/DESIGN_SYSTEM.md", "Barve, tipografija, komponente"],
  ["docs/M0_PLAN.md", "Naloge M0, testi, CI, migracije"],
];

export default function ReviewHub() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <Logo href="/odkrivanje" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Prototip M0 (arhiv)</h1>
        <p className="text-ink-muted">
          Klikljivi žičnati modeli z <strong>demo podatki</strong>. Nič ni povezano z bazo, prijavo ali
          plačili. Najbolje si jih ogledaš na telefonu ali v ozkem oknu.
        </p>
      </div>

      {screens.map((g) => (
        <section key={g.group} className="space-y-3">
          <h2 className="font-display text-xl font-bold">{g.group}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
            {g.items.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 p-4 hover:bg-brand-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.label}</span>
                    {s.note && <span className="block text-sm text-ink-muted">{s.note}</span>}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-5 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Dokumentacija v repozitoriju</h2>
        <ul className="space-y-2 text-sm">
          {docs.map(([path, desc]) => (
            <li key={path}>
              <code className="rounded bg-surface px-1.5 py-0.5 ring-1 ring-line">{path}</code> — {desc}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
