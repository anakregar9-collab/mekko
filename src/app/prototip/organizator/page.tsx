import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Panel, StatTile } from "@/components/workspace/stat-tile";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { events, seatsTaken } from "@/lib/demo/data";
import { formatSlot } from "@/lib/format";

export const metadata: Metadata = { title: "Organizator" };

/** Demo attendees of "Keramika za začetnike" — same canonical booking records the visitor sees. */
const attendees = [
  { name: "Nina N.", qty: 2, status: "Potrjeno", via: "Mekko" },
  { name: "Luka P.", qty: 1, status: "Potrjeno", via: "Mekko" },
  { name: "Eva Z.", qty: 2, status: "Potrjeno", via: "Mekko" },
  { name: "Tina R.", qty: 1, status: "Potrjeno", via: "Ročno dodano" },
];

export default function OrganizerDashboard() {
  const spaceEvents = events.filter((e) => e.spaceId === "sp-glina");
  const totalBooked = spaceEvents.reduce((n, e) => n + seatsTaken(e), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Pozdravljena, Glinena hiša</h1>
          <p className="text-ink-muted">Pregled prihajajočih dogodkov in prijav.</p>
        </div>
        <ButtonLink href="/prototip/ustvari/dogodek">
          <Plus aria-hidden="true" className="size-5" /> Nov dogodek
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Prihajajoči dogodki" value={String(spaceEvents.length)} />
        <StatTile label="Prijave (vse)" value={String(totalBooked)} hint="demo" />
        <StatTile label="Zasedenost" value="75 %" hint="Keramika za začetnike" />
        <StatTile label="Prihodki" value="—" hint="Finance in izplačila: M3" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Prihajajoči dogodki">
          <ul className="divide-y divide-line">
            {spaceEvents.map((e) => {
              const taken = seatsTaken(e);
              const pct = e.capacity ? Math.round((taken / e.capacity) * 100) : null;
              return (
                <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/prototip/dogodki/${e.slug}`} className="font-semibold hover:underline">
                      {e.title}
                    </Link>
                    <p className="text-sm text-ink-muted">
                      {formatSlot(e.occurrences[0].startsAt, e.occurrences[0].endsAt)}
                    </p>
                  </div>
                  <div className="w-full sm:w-44">
                    {pct !== null ? (
                      <>
                        <div className="flex justify-between text-xs text-ink-muted">
                          <span>
                            {taken}/{e.capacity}
                          </span>
                          <span>{pct} %</span>
                        </div>
                        <div
                          className="mt-1 h-2 overflow-hidden rounded-full bg-cream"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                          aria-label={`Zasedenost ${e.title}`}
                        >
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-ink-muted">{taken} prijav · brez omejitve</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Udeleženci · Keramika za začetnike" action={<Badge tone="sage">6/8 mest</Badge>}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th scope="col" className="py-2 font-semibold">
                    Ime
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Oseb
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    Vir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attendees.map((a) => (
                  <tr key={a.name}>
                    <td className="py-2 font-medium">{a.name}</td>
                    <td className="py-2 tabular-nums">{a.qty}</td>
                    <td className="py-2">{a.via}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Za urediti">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Badge tone="sun">Opomnik</Badge> Dopolni profil prostora (galerija, družbena omrežja)
          </li>
          <li className="flex items-center gap-2">
            <Badge tone="lilac">M3</Badge> Za plačljive vstopnice bo potrebna verifikacija prodajalca
          </li>
        </ul>
      </Panel>
    </div>
  );
}
