/**
 * Organizer responsibility notice (founder 2026-11-16): Mekko is only the platform; registration,
 * invoicing, cash, taxes and refunds are the organizer's responsibility. Wording pending legal review.
 */
export function OrganizerResponsibility({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-ink-muted" data-testid="organizer-responsibility">
        Mekko plačil ne obdeluje in ne zaračuna provizije. Za registrirano dejavnost, izdajanje računov,
        sprejemanje gotovine, davke in vračila odgovarjaš ti kot organizator, ne Mekko. Cene in navodil po
        objavi ni več mogoče spremeniti.
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-cream p-4 text-sm" data-testid="organizer-responsibility">
      <p className="font-semibold">Za kaj odgovarjaš kot organizator</p>
      <p>
        Mekko je platforma za objavo dogodkov in prijave. Pogodbo z udeleženci skleneš ti, zato za izvedbo in
        vse obveznosti odgovarjaš ti, ne Mekko. To pomeni, da:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          imaš ustrezno registrirano dejavnost (podjetje, s.p., društvo, zavod ali ODD), kadar jo zakon
          zahteva za tvoje delo in prodajo;
        </li>
        <li>izdajaš račune in pri gotovini upoštevaš pravila davčnega potrjevanja računov (FURS);</li>
        <li>obračunaš in plačaš davke ter DDV, kadar si zavezanec;</li>
        <li>urediš odpovedi in vračila denarja v skladu s svojimi pogoji in zakonom.</li>
      </ul>
      <p className="text-ink-muted">
        Če nisi prepričan/-a, kaj velja zate, se posvetuj z računovodjo ali na portalu SPOT.
      </p>
    </div>
  );
}
