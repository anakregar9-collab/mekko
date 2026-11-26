/**
 * DEMO DATA — fictional people, spaces and events used only by the M0
 * clickable prototypes under /prototip. Nothing here is persisted or real.
 */
import type {
  Booking,
  CancellationPolicy,
  Category,
  ConversationPreview,
  Idea,
  MekkoEvent,
  Notification,
  Space,
} from "@/lib/domain/types";

export const IS_DEMO = true as const;

/** Fixed "today" so prototype screens and tests are deterministic. */
export const DEMO_TODAY = "2026-11-11T12:00:00+01:00";

export const categories: Category[] = [
  { slug: "keramika", label: "Keramika" },
  { slug: "slikanje", label: "Slikanje" },
  { slug: "rocna-dela", label: "Ročna dela" },
  { slug: "gibanje", label: "Gibanje" },
  { slug: "kaligrafija", label: "Kaligrafija" },
  { slug: "dom-in-deko", label: "Dom in deko" },
];

export const cancellationPolicies: CancellationPolicy[] = [
  {
    code: "flexible",
    title: "Prilagodljiva",
    summary: "Brezplačna odpoved do 24 ur pred začetkom.",
  },
  {
    code: "moderate",
    title: "Zmerna",
    summary: "Polno vračilo do 5 dni pred začetkom, nato 50 %.",
  },
  {
    code: "strict",
    title: "Stroga",
    summary: "Polno vračilo do 14 dni pred začetkom, nato brez vračila.",
  },
  {
    code: "no_refund",
    title: "Brez vračila",
    summary: "Vračilo ni mogoče, razen če organizator odpove dogodek.",
  },
];

export const spaces: Space[] = [
  {
    id: "sp-glina",
    slug: "glinena-hisa",
    kind: "studio",
    name: "Glinena hiša",
    city: "Ljubljana",
    tagline: "Keramični studio za začetnike in vse, ki radi umažejo roke.",
    verified: true,
    cover: "clay",
  },
  {
    id: "sp-nitka",
    slug: "krozek-nitka",
    kind: "community",
    name: "Krožek Nitka",
    city: "Celje",
    tagline: "Skupnost pletilk in kvačkarjev vseh starosti.",
    verified: false,
    cover: "lilac",
  },
  {
    id: "sp-ana",
    slug: "ana-rise",
    kind: "solo_creator",
    name: "Ana Riše",
    city: "Maribor",
    tagline: "Akvarel, kaligrafija in počasni ustvarjalni večeri.",
    verified: true,
    cover: "sky",
  },
  {
    id: "sp-kras",
    slug: "drustvo-ustvarjalni-kras",
    kind: "association",
    name: "Društvo Ustvarjalni Kras",
    city: "Sežana",
    tagline: "Delavnice, gibanje in druženje na Krasu.",
    verified: true,
    cover: "sage",
  },
];

export const events: MekkoEvent[] = [
  {
    id: "ev-keramika",
    slug: "keramika-za-zacetnike",
    spaceId: "sp-glina",
    title: "Keramika za začetnike",
    summary: "Spoznaj vretenje in oblikuj svojo prvo skodelico.",
    description:
      "Na triurni delavnici se naučiš osnov centriranja gline in vretenja. Izdelke po žganju prevzameš v studiu čez dva tedna.",
    categorySlug: "keramika",
    schedule: "one_off",
    bookingScope: "occurrence",
    isOnline: false,
    visibility: "public",
    registrationMode: "native",
    status: "published",
    city: "Ljubljana",
    address: "Trubarjeva cesta 12, 1000 Ljubljana",
    occurrences: [
      {
        id: "oc-ker-1",
        startsAt: "2026-11-21T10:00:00+01:00",
        endsAt: "2026-11-21T13:00:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [
      { id: "tt-ker-std", name: "Standardna", priceCents: 4500, capacity: 8, sold: 6 },
      { id: "tt-ker-par", name: "Za dva", priceCents: 8000, capacity: null, sold: 0 },
    ],
    capacity: 8,
    materials: ["Predpasnik ali stara oblačila", "Glina in orodje sta vključena"],
    cancellationPolicyCode: "moderate",
    cover: "clay",
  },
  {
    id: "ev-akvarel",
    slug: "vecer-akvarela",
    spaceId: "sp-ana",
    title: "Večer akvarela ob čaju",
    summary: "Sproščen večer slikanja jesenskih motivov.",
    description: "Vodeno slikanje za vse ravni. Pripravimo papir, barve in čopiče, ti prineseš dobro voljo.",
    categorySlug: "slikanje",
    schedule: "one_off",
    bookingScope: "occurrence",
    isOnline: false,
    visibility: "public",
    registrationMode: "native",
    status: "published",
    city: "Maribor",
    address: "Poštna ulica 3, 2000 Maribor",
    occurrences: [
      {
        id: "oc-akv-1",
        startsAt: "2026-11-26T18:00:00+01:00",
        endsAt: "2026-11-26T20:30:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [{ id: "tt-akv", name: "Vstopnica", priceCents: 2800, capacity: 12, sold: 12 }],
    capacity: 12,
    materials: ["Vse potrebščine so vključene"],
    cancellationPolicyCode: "flexible",
    cover: "sky",
  },
  {
    id: "ev-pletenje",
    slug: "tecaj-pletenja",
    spaceId: "sp-nitka",
    title: "Tečaj pletenja – 4 srečanja",
    summary: "Od prve zanke do lastne kape v štirih tednih.",
    description:
      "Večkratni tečaj: z eno prijavo se udeležiš vseh štirih srečanj. Vsa srečanja se ti prikažejo v koledarju.",
    categorySlug: "rocna-dela",
    schedule: "multi_session",
    bookingScope: "series",
    isOnline: false,
    visibility: "public",
    registrationMode: "manual_payment",
    status: "published",
    city: "Celje",
    address: "Knjižnica Celje, Muzejski trg 1a, 3000 Celje",
    occurrences: [
      {
        id: "oc-ple-1",
        startsAt: "2026-12-01T17:00:00+01:00",
        endsAt: "2026-12-01T19:00:00+01:00",
        status: "scheduled",
      },
      {
        id: "oc-ple-2",
        startsAt: "2026-12-08T17:00:00+01:00",
        endsAt: "2026-12-08T19:00:00+01:00",
        status: "scheduled",
      },
      {
        id: "oc-ple-3",
        startsAt: "2026-12-15T17:00:00+01:00",
        endsAt: "2026-12-15T19:00:00+01:00",
        status: "scheduled",
      },
      {
        id: "oc-ple-4",
        startsAt: "2026-12-22T17:00:00+01:00",
        endsAt: "2026-12-22T19:00:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [{ id: "tt-ple", name: "Celoten tečaj", priceCents: 6000, capacity: 10, sold: 4 }],
    capacity: 10,
    materials: ["Volna srednje debeline", "Pletilki št. 5"],
    cancellationPolicyCode: "strict",
    cover: "lilac",
  },
  {
    id: "ev-joga",
    slug: "jutranja-joga-na-krasu",
    spaceId: "sp-kras",
    title: "Jutranja joga na Krasu",
    summary: "Vsako soboto zjutraj, prijava za posamezen termin.",
    description:
      "Ponavljajoči se dogodek: prijaviš se na posamezen termin. Ob slabem vremenu vadimo v dvorani društva.",
    categorySlug: "gibanje",
    schedule: "recurring",
    bookingScope: "occurrence",
    isOnline: false,
    visibility: "public",
    registrationMode: "native",
    status: "published",
    city: "Sežana",
    address: "Park Pri gradu, 6210 Sežana",
    occurrences: [
      {
        id: "oc-jog-1",
        startsAt: "2026-11-14T08:00:00+01:00",
        endsAt: "2026-11-14T09:00:00+01:00",
        status: "scheduled",
      },
      {
        id: "oc-jog-2",
        startsAt: "2026-11-21T08:00:00+01:00",
        endsAt: "2026-11-21T09:00:00+01:00",
        status: "scheduled",
      },
      {
        id: "oc-jog-3",
        startsAt: "2026-11-28T08:00:00+01:00",
        endsAt: "2026-11-28T09:00:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [{ id: "tt-jog", name: "Termin", priceCents: 0, capacity: 20, sold: 9 }],
    capacity: 20,
    materials: ["Lastna podloga", "Topla oblačila"],
    cancellationPolicyCode: "flexible",
    cover: "sage",
  },
  {
    id: "ev-kaligrafija",
    slug: "online-kaligrafija",
    spaceId: "sp-ana",
    title: "Online: osnove kaligrafije",
    summary: "Živa spletna delavnica s posnetkom za udeležence.",
    description:
      "Povezavo do spletne sobe prejmeš po prijavi. Potrebuješ le flomaster s čopičasto konico in papir.",
    categorySlug: "kaligrafija",
    schedule: "one_off",
    bookingScope: "occurrence",
    isOnline: true,
    visibility: "public",
    registrationMode: "native",
    status: "published",
    city: "Online",
    occurrences: [
      {
        id: "oc-kal-1",
        startsAt: "2026-12-03T19:00:00+01:00",
        endsAt: "2026-12-03T20:30:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [{ id: "tt-kal", name: "Udeležba", priceCents: 1500, capacity: null, sold: 31 }],
    capacity: null,
    materials: ["Čopičasti flomaster", "Gladek papir A4"],
    cancellationPolicyCode: "no_refund",
    cover: "sun",
  },
  {
    id: "ev-svece",
    slug: "svece-iz-sojinega-voska",
    spaceId: "sp-kras",
    title: "Sveče iz sojinega voska",
    summary: "Prijava poteka na spletni strani društva.",
    description:
      "Ta dogodek uporablja zunanjo prijavo. Rezervacija ne poteka prek Mekka, zato se ne prikaže v Mojih aktivnostih.",
    categorySlug: "dom-in-deko",
    schedule: "one_off",
    bookingScope: "occurrence",
    isOnline: false,
    visibility: "public",
    registrationMode: "external",
    externalUrl: "https://example.org/prijava",
    status: "published",
    city: "Sežana",
    address: "Partizanska cesta 4, 6210 Sežana",
    occurrences: [
      {
        id: "oc-sve-1",
        startsAt: "2026-12-12T16:00:00+01:00",
        endsAt: "2026-12-12T18:00:00+01:00",
        status: "scheduled",
      },
    ],
    ticketTypes: [{ id: "tt-sve", name: "Udeležba", priceCents: 2000, capacity: null, sold: 0 }],
    capacity: null,
    materials: [],
    cancellationPolicyCode: "flexible",
    cover: "coral",
  },
];

export const ideas: Idea[] = [
  {
    id: "id-makrame",
    slug: "makrame-obesanka",
    authorName: "Maja K.",
    title: "Makrame obešanka za rastline",
    summary: "Navodila v PDF z 12 koraki in fotografijami.",
    categorySlug: "dom-in-deko",
    guideType: "pdf",
    priceCents: 0,
    likes: 214,
    saves: 96,
    cover: "sun",
  },
  {
    id: "id-krep",
    slug: "rozice-iz-krep-papirja",
    authorName: "Ana Riše",
    spaceId: "sp-ana",
    title: "Rožice iz krep papirja",
    summary: "Zunanji vodič z videom – idealno za otroke.",
    categorySlug: "rocna-dela",
    guideType: "external",
    priceCents: 0,
    likes: 88,
    saves: 40,
    cover: "coral",
  },
  {
    id: "id-torba",
    slug: "kvackana-torba",
    authorName: "Krožek Nitka",
    spaceId: "sp-nitka",
    title: "Vzorec za kvačkano torbo",
    summary: "Plačljiv vzorec s shemo in video namigi.",
    categorySlug: "rocna-dela",
    guideType: "pdf",
    priceCents: 600,
    likes: 152,
    saves: 71,
    cover: "lilac",
  },
];

/** The demo visitor's bookings, "Nina", for Moje aktivnosti. */
export const myBookings: Booking[] = [
  {
    id: "bk-1",
    eventId: "ev-joga",
    occurrenceId: "oc-jog-1",
    quantity: 1,
    status: "confirmed",
    bookedAt: "2026-11-02T09:12:00+01:00",
  },
  {
    id: "bk-2",
    eventId: "ev-keramika",
    occurrenceId: "oc-ker-1",
    quantity: 2,
    status: "confirmed",
    bookedAt: "2026-11-05T20:41:00+01:00",
  },
  {
    id: "bk-3",
    eventId: "ev-pletenje",
    occurrenceId: null,
    quantity: 1,
    status: "pending_payment",
    bookedAt: "2026-11-09T12:00:00+01:00",
  },
  {
    id: "bk-4",
    eventId: "ev-akvarel",
    occurrenceId: "oc-akv-1",
    quantity: 1,
    status: "waitlisted",
    bookedAt: "2026-11-10T08:30:00+01:00",
  },
];

export const notifications: Notification[] = [
  {
    id: "n-1",
    kind: "booking_confirmed",
    title: "Rezervacija potrjena",
    body: "Keramika za začetnike · 2 osebi",
    createdAt: "2026-11-05T20:42:00+01:00",
    read: false,
  },
  {
    id: "n-2",
    kind: "event_reminder",
    title: "Opomnik",
    body: "Jutranja joga na Krasu je v soboto ob 8:00.",
    createdAt: "2026-11-11T08:00:00+01:00",
    read: false,
  },
  {
    id: "n-3",
    kind: "event_changed",
    title: "Sprememba lokacije",
    body: "Tečaj pletenja: srečanje 1. 12. bo v čitalnici.",
    createdAt: "2026-11-08T14:10:00+01:00",
    read: true,
  },
];

export const conversations: ConversationPreview[] = [
  {
    id: "c-1",
    withName: "Glinena hiša",
    lastMessage: "Lahko pripeljete tudi otroka, star je 10 let?",
    updatedAt: "2026-11-10T19:02:00+01:00",
    unread: 1,
  },
  {
    id: "c-2",
    withName: "Maja K.",
    lastMessage: "Hvala za fotko tvoje obešanke!",
    updatedAt: "2026-11-07T11:20:00+01:00",
    unread: 0,
  },
];

export function getEventBySlug(slug: string): MekkoEvent | undefined {
  return events.find((e) => e.slug === slug);
}

export function getEventById(id: string): MekkoEvent | undefined {
  return events.find((e) => e.id === id);
}

export function getSpace(id: string): Space | undefined {
  return spaces.find((s) => s.id === id);
}

export function getCategoryLabel(slug: string): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

export function getPolicy(code: CancellationPolicy["code"]): CancellationPolicy {
  const p = cancellationPolicies.find((c) => c.code === code);
  if (!p) throw new Error(`Unknown policy ${code}`);
  return p;
}

export function seatsTaken(event: MekkoEvent): number {
  return event.ticketTypes.reduce((sum, t) => sum + t.sold, 0);
}
