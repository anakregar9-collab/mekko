import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Pogoji uporabe" };

export default function Page() {
  return (
    <LegalPage
      title="Pogoji uporabe"
      intro={
        <p>
          Ti pogoji urejajo uporabo platforme Mekko (spletna stran in aplikacija), ki jo upravlja{" "}
          {OPERATOR.name}, {OPERATOR.address} (v nadaljevanju »Mekko« ali »mi«). Z ustvarjanjem računa
          potrdiš, da si pogoje prebral/-a in jih sprejemaš. Kako obdelujemo osebne podatke, piše v{" "}
          <Link href="/zasebnost" className="font-semibold text-brand-strong underline">
            Politiki zasebnosti
          </Link>
          .
        </p>
      }
      sections={[
        {
          id: "kaj-je-mekko",
          title: "Kaj je Mekko",
          body: (
            <>
              <p>
                Mekko je platforma za odkrivanje ustvarjalnih in prostočasnih dejavnosti v Sloveniji.
                Organizatorji na njej objavljajo dogodke in delavnice, uporabniki pa ideje in objave svojih
                izdelkov ter se prijavljajo na dogodke.
              </p>
              <p>
                <strong>Mekko je posrednik.</strong> Pogodbo o udeležbi na dogodku skleneš neposredno z
                organizatorjem. Mekko ni organizator dogodkov, ni stranka te pogodbe in ne odgovarja za
                njihovo izvedbo.
              </p>
            </>
          ),
        },
        {
          id: "racun",
          title: "Račun",
          body: (
            <>
              <ul>
                <li>Za ustvarjanje računa moraš biti star/-a vsaj {OPERATOR.minimumAge} let.</li>
                <li>
                  Podatki ob registraciji morajo biti resnični. Za varnost gesla in dejanja v svojem računu
                  odgovarjaš sam/-a.
                </li>
                <li>
                  Račun je oseben. Ne smeš ga prenesti na drugo osebo ali ga uporabljati v imenu drugega brez
                  dovoljenja.
                </li>
                <li>Račun lahko kadar koli izbrišeš (Moj Mekko → Moji podatki).</li>
              </ul>
            </>
          ),
        },
        {
          id: "dogodki",
          title: "Prijave na dogodke",
          body: (
            <>
              <ul>
                <li>
                  Pri brezplačnem dogodku je prijava potrjena takoj. Pri dogodku s plačilom organizatorju
                  prijava rezervira mesto, ki ga organizator potrdi, ko prejme plačilo.
                </li>
                <li>
                  <strong>Mekko plačil ne obdeluje in jih ne prejema.</strong> Plačilo poteka neposredno med
                  tabo in organizatorjem po njegovih navodilih. Mekko nikoli sam ne potrdi, da je plačilo
                  opravljeno.
                </li>
                <li>
                  Za odjavo veljajo pogoji odjave, ki jih organizator navede pri dogodku. Za vračila se
                  dogovoriš z organizatorjem.
                </li>
                <li>
                  Če organizator dogodek odpove ali spremeni lokacijo, te obvestimo v aplikaciji. Neplačano
                  rezervacijo lahko organizator sprosti, če plačila ne prejme do roka.
                </li>
                <li>
                  Pri dogodkih z zunanjo prijavo zapustiš Mekko. Za prijavo in plačilo na tuji strani veljajo
                  pogoji tamkajšnjega ponudnika.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "organizatorji",
          title: "Organizatorji",
          body: (
            <>
              <ul>
                <li>
                  Organizator mora navesti svoj pravni status (podjetje, s.p., društvo, zavod, osebno
                  dopolnilno delo ali zasebnik) in resnične podatke ponudnika.
                </li>
                <li>
                  <strong>Za izvajanje dejavnosti odgovarja organizator, ne Mekko.</strong> To vključuje
                  registracijo dejavnosti, kadar jo zakon zahteva, izdajanje računov, davčno potrjevanje
                  gotovinskih računov, obračun davkov in DDV, varnost udeležencev, zavarovanje ter odpovedi in
                  vračila.
                </li>
                <li>
                  Opisi, cene, termini in navodila za plačilo morajo biti resnični in jasni. Cene in pogojev
                  plačila po objavi ni mogoče spremeniti.
                </li>
                <li>
                  Organizator podatke udeležencev (ime, sporočila, število oseb) uporablja samo za izvedbo
                  dogodka in v skladu z zakonodajo o varstvu osebnih podatkov.
                </li>
                <li>Mekko za objavo dogodkov in prijave v testnem obdobju ne zaračunava provizije.</li>
              </ul>
            </>
          ),
        },
        {
          id: "vsebine",
          title: "Ideje, objave v feedu in komentarji",
          body: (
            <>
              <ul>
                <li>Objavljaš lahko samo vsebine, ki so tvoje ali imaš pravico, da jih deliš.</li>
                <li>
                  <strong>Na fotografijah ne sme biti prepoznavnih otrok.</strong> Za odrasle osebe na
                  fotografijah potrebuješ njihovo dovoljenje.
                </li>
                <li>
                  Prepovedane so žaljive, nasilne, diskriminatorne, spolno eksplicitne, zavajajoče ali
                  nezakonite vsebine, neželeno oglaševanje (spam) ter kršitve avtorskih pravic in zasebnosti
                  drugih.
                </li>
                <li>
                  Avtorske pravice ostanejo tvoje. Mekku daješ brezplačno, neizključno dovoljenje, da tvojo
                  vsebino prikazuje na platformi v obsegu, ki ga izbereš (na primer vsem ali samo sledilcem),
                  dokler je ne izbrišeš.
                </li>
                <li>Za navodila v idejah odgovarja avtor. Ideje uporabljaš na lastno odgovornost.</li>
              </ul>
            </>
          ),
        },
        {
          id: "sporocila",
          title: "Sporočila in vedenje",
          body: (
            <ul>
              <li>
                Zasebna sporočila uporabljaj spoštljivo. Nadlegovanje in neželena sporočila so prepovedani.
              </li>
              <li>
                Nove račune omejujemo pri pošiljanju sporočil neznanim osebam in pri številu objav, sporočil
                in komentarjev, da preprečimo zlorabe.
              </li>
              <li>Vsako osebo lahko blokiraš. Blokirana oseba ti ne more pisati in ne vidi tvojih objav.</li>
            </ul>
          ),
        },
        {
          id: "moderacija",
          title: "Prijave vsebin in moderacija",
          body: (
            <>
              <p>
                Vsako vsebino lahko prijaviš z gumbom »Prijavi«. Moderatorji Mekka prijave pregledajo in lahko
                vsebino skrijejo ali odstranijo, avtorja pa obvestijo z razlogom. Ob hujših ali ponavljajočih
                se kršitvah lahko račun omejimo. Vsi posegi moderatorjev se beležijo.
              </p>
              <p>
                Če se z odločitvijo ne strinjaš, nam piši na {OPERATOR.email}. Odločitev bomo ponovno
                pregledali.
              </p>
            </>
          ),
        },
        {
          id: "odgovornost",
          title: "Omejitev odgovornosti",
          body: (
            <ul>
              <li>
                Mekko omogoča stik med uporabniki in organizatorji, ne jamči pa za kakovost, varnost ali
                izvedbo dogodkov ter točnost vsebin, ki jih objavijo uporabniki.
              </li>
              <li>
                Trudimo se, da platforma deluje brez prekinitev, a tega ne moremo zagotoviti. V testnem
                obdobju so možne napake in spremembe funkcij.
              </li>
              <li>
                Te omejitve ne posegajo v pravice, ki jih imaš po zakonu in jih s pogodbo ni mogoče
                izključiti.
              </li>
            </ul>
          ),
        },
        {
          id: "spremembe",
          title: "Spremembe pogojev",
          body: (
            <p>
              Pogoje lahko spremenimo. O bistvenih spremembah te obvestimo vnaprej, ob naslednji prijavi pa te
              prosimo za ponovno potrditev.
            </p>
          ),
        },
        {
          id: "pravo",
          title: "Veljavno pravo in kontakt",
          body: (
            <>
              <p>
                Za te pogoje velja pravo Republike Slovenije. Spore poskušamo najprej rešiti sporazumno,
                potrošniki pa lahko uporabijo tudi izvensodno reševanje potrošniških sporov.
              </p>
              <p>
                Kontakt: {OPERATOR.name}, {OPERATOR.address}, {OPERATOR.registration}, e-pošta{" "}
                {OPERATOR.email}.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
