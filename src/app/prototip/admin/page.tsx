import type { Metadata } from "next";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { PrototypeAction } from "@/components/prototype-action";
import { events, ideas, spaces } from "@/lib/demo/data";

export const metadata: Metadata = { title: "Admin" };

const moderationQueue = [
  { id: "r-1", what: "Ideja · “Hitri zaslužek z doma”", reason: "Prijava: spam", risk: "visoko" },
  { id: "r-2", what: "Dogodek · Večer akvarela ob čaju", reason: "Prijava: napačen kraj", risk: "nizko" },
];

const verification = spaces.filter((s) => !s.verified);

const audit = [
  { at: "11. 11. 09:14", who: "ustanoviteljica", what: "Dodeljena vloga moderator → Jan K." },
  { at: "10. 11. 17:02", who: "ustanoviteljica", what: "Kategorija “Kaligrafija” dodana" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Administracija</h1>
        <p className="text-ink-muted">
          Vse vrednosti so demo. Finančni podatki se ne prikazujejo, dokler plačila niso povezana.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Prostori" value={String(spaces.length)} />
        <StatTile label="Objavljeni dogodki" value={String(events.length)} />
        <StatTile label="Ideje" value={String(ideas.length)} />
        <StatTile label="Bruto promet" value="—" hint="Transakcije: M3" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Moderacija" action={<Badge tone="brand">{moderationQueue.length} odprte</Badge>}>
          <ul className="divide-y divide-line">
            {moderationQueue.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.what}</p>
                  <p className="text-sm text-ink-muted">{m.reason}</p>
                </div>
                <Badge tone={m.risk === "visoko" ? "brand" : "neutral"}>Tveganje: {m.risk}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Preverjanje organizatorjev">
          {verification.length === 0 ? (
            <p className="text-ink-muted">Ni čakajočih.</p>
          ) : (
            <ul className="divide-y divide-line">
              {verification.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-ink-muted">{s.city}</p>
                  </div>
                  <PrototypeAction
                    size="sm"
                    variant="secondary"
                    className="sm:w-auto"
                    explanation="preverjanje z revizijsko sledjo pride v M3."
                  >
                    Preglej
                  </PrototypeAction>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Konfiguracija platforme">
          <dl className="divide-y divide-line text-sm">
            <ConfigRow k="Provizija" v="Ni določena – odprta odločitev" tone="sun" />
            <ConfigRow k="Kvota brezplačnih objav" v="Ni določena – odprta odločitev" tone="sun" />
            <ConfigRow k="Plačila v živo" v="Izklopljena" tone="neutral" />
            <ConfigRow k="Kategorije" v="6 aktivnih" tone="neutral" />
          </dl>
        </Panel>

        <Panel title="Revizijska sled (zadnje)">
          <ul className="space-y-2 text-sm">
            {audit.map((a) => (
              <li key={a.at} className="grid grid-cols-[6.5rem_1fr] gap-2">
                <span className="text-ink-muted tabular-nums">{a.at}</span>
                <span>
                  <span className="font-semibold">{a.who}:</span> {a.what}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function ConfigRow({ k, v, tone }: { k: string; v: string; tone: "sun" | "neutral" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <dt className="text-ink-muted">{k}</dt>
      <dd>
        <Badge tone={tone}>{v}</Badge>
      </dd>
    </div>
  );
}
