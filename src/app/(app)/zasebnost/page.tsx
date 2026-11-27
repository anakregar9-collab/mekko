import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Politika zasebnosti" };

export default function Page() {
  return (
    <LegalPage
      title="Politika zasebnosti"
      intro={
        <p>
          Tukaj pojasnjujemo, katere osebne podatke Mekko obdeluje, zakaj, koliko časa in kakšne pravice imaš.
          Upravljavec podatkov je {OPERATOR.name}, {OPERATOR.address}, e-pošta {OPERATOR.email}.
        </p>
      }
      sections={[
        {
          id: "podatki",
          title: "Katere podatke obdelujemo",
          body: (
            <ul>
              <li>
                <strong>Račun:</strong> e-poštni naslov in geslo (shranjeno samo v zaščiteni obliki).
              </li>
              <li>
                <strong>Profil:</strong> ime, uporabniško ime, opis, zanimanja in nastavitev vidnosti.
                Približen kraj samo, če to izrecno dovoliš.
              </li>
              <li>
                <strong>Dejavnost:</strong> prijave na dogodke (termin, število oseb, sporočilo organizatorju,
                stanje plačila po potrditvi organizatorja), shranjene vsebine, sledenja, všečki.
              </li>
              <li>
                <strong>Vsebine, ki jih objaviš:</strong> ideje, objave in fotografije, komentarji, zasebna
                sporočila.
              </li>
              <li>
                <strong>Organizatorji:</strong> podatki prostora in podatki ponudnika (naziv, naslov, matična
                ali davčna številka, kontaktni e-naslov).
              </li>
              <li>
                <strong>Varnost:</strong> prijave vsebin, blokade in zapisi posegov moderatorjev.
              </li>
            </ul>
          ),
        },
        {
          id: "nameni",
          title: "Zakaj jih obdelujemo (pravna podlaga)",
          body: (
            <ul>
              <li>
                <strong>Izvajanje pogodbe</strong> (Pogoji uporabe): račun, prijave na dogodke, objavljanje,
                sporočila.
              </li>
              <li>
                <strong>Zakoniti interes:</strong> varnost platforme, preprečevanje zlorab in neželene pošte,
                moderacija.
              </li>
              <li>
                <strong>Privolitev:</strong> približna lokacija in e-novice. Privolitev lahko kadar koli
                prekličeš v Moj Mekko → Profil in zasebnost.
              </li>
              <li>
                <strong>Zakonske obveznosti:</strong> na primer odgovori na zahteve pristojnih organov.
              </li>
            </ul>
          ),
        },
        {
          id: "kdo-vidi",
          title: "Kdo vidi tvoje podatke",
          body: (
            <ul>
              <li>
                Tvoj e-poštni naslov ni nikoli prikazan drugim uporabnikom. Tvoje prijave na dogodke in nakupi
                niso del javnega profila.
              </li>
              <li>
                Organizator dogodka vidi tvoje ime, uporabniško ime, število oseb in sporočilo, ki si mu ga
                poslal/-a ob prijavi.
              </li>
              <li>
                Objave v feedu vidijo vsi prijavljeni ali samo tvoji sledilci, kot izbereš. Pri zasebnem
                profilu jih vidijo samo sledilci, ki jih potrdiš.
              </li>
              <li>
                Zasebna sporočila vidita samo udeleženca pogovora. Moderatorji vidijo vsebino sporočila samo,
                če je bilo prijavljeno.
              </li>
            </ul>
          ),
        },
        {
          id: "obdelovalci",
          title: "Ponudniki, ki nam pomagajo",
          body: (
            <>
              <ul>
                <li>
                  <strong>Supabase</strong> – podatkovna baza, prijava in shramba fotografij. Strežniki v EU
                  (Frankfurt, Nemčija).
                </li>
                <li>
                  <strong>Vercel</strong> – gostovanje spletne aplikacije. Strežniki za obdelavo zahtev v EU
                  (Frankfurt), podjetje s sedežem v ZDA. Prenos ureja dogovor o obdelavi podatkov s
                  standardnimi pogodbenimi določili.
                </li>
                <li>
                  <strong>Resend</strong> (ko bo uveden) – pošiljanje e-pošte.
                </li>
              </ul>
              <p>Podatkov ne prodajamo in jih ne posredujemo oglaševalcem.</p>
            </>
          ),
        },
        {
          id: "hramba",
          title: "Koliko časa jih hranimo",
          body: (
            <ul>
              <li>Podatke računa in profila, dokler imaš račun.</li>
              <li>
                Ko izbrišeš račun, ga takoj skrijemo; v 30 dneh lahko izbris prekličeš. Nato izbrišemo profil,
                ideje, objave, komentarje in sporočila. Prijave na dogodke, nakupi kart in tečajev ostanejo
                organizatorjem anonimno (brez imena), ker jih potrebujejo za svojo evidenco; daljša hramba
                velja tudi, kjer jo zahteva zakon.
              </li>
              <li>Zapise posegov moderatorjev hranimo do 2 leti zaradi varnosti in morebitnih sporov.</li>
            </ul>
          ),
        },
        {
          id: "piskotki",
          title: "Piškotki",
          body: (
            <p>
              Uporabljamo samo nujne piškotke za prijavo in varnost seje. Analitičnih ali oglaševalskih
              piškotkov ne uporabljamo, zato pasice za privolitev ni. Če jih bomo kdaj uvedli, te bomo prej
              vprašali za privolitev.
            </p>
          ),
        },
        {
          id: "pravice",
          title: "Tvoje pravice",
          body: (
            <>
              <p>
                Imaš pravico do dostopa, popravka, izbrisa, omejitve obdelave, prenosljivosti in ugovora ter
                pravico, da prekličeš privolitev. Kopijo podatkov takoj preneseš, račun pa izbrišeš sam/-a v{" "}
                <Link href="/moj-mekko/podatki" className="font-semibold text-brand-strong underline">
                  Moj Mekko → Moji podatki
                </Link>
                . Za drugo nam piši na {OPERATOR.email}; odgovorimo v 30 dneh.
              </p>
              <p>
                Pritožbo lahko vložiš pri Informacijskem pooblaščencu RS (Dunajska cesta 22, 1000 Ljubljana,
                www.ip-rs.si).
              </p>
            </>
          ),
        },
        {
          id: "otroci",
          title: "Mladoletni",
          body: (
            <p>
              Mekko je namenjen osebam, starim vsaj {OPERATOR.minimumAge} let. Na fotografijah ne sme biti
              prepoznavnih otrok. Take objave moderatorji odstranijo.
            </p>
          ),
        },
        {
          id: "spremembe",
          title: "Spremembe",
          body: <p>O bistvenih spremembah te obvestimo v aplikaciji in te prosimo za ponovno potrditev.</p>,
        },
      ]}
    />
  );
}
