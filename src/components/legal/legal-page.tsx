import { TriangleAlert } from "lucide-react";
import { TERMS_VERSION } from "@/lib/legal";

/** Shared layout for legal texts: draft notice, version, readable width and section anchors. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-6" data-testid="legal-page">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <p
          role="note"
          className="flex items-start gap-2 rounded-2xl bg-sun-soft p-3 text-sm text-sun-ink"
          data-testid="legal-draft"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Osnutek v pregledu pri pravniku. Mekko je trenutno v testnem obdobju. Različica {TERMS_VERSION}.
          </span>
        </p>
        <div className="leading-relaxed">{intro}</div>
      </header>
      <nav aria-label="Vsebina" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-brand-strong underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 space-y-2 leading-relaxed">
          <h2 className="font-display text-xl font-bold">
            {i + 1}. {s.title}
          </h2>
          <div className="space-y-2 [&_li]:ml-5 [&_li]:list-disc">{s.body}</div>
        </section>
      ))}
    </article>
  );
}
