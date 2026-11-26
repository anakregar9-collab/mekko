/**
 * Canonical domain types shared by visitor, organizer and admin views.
 * They mirror the planned database schema in docs/DOMAIN_MODEL.md.
 * Only the subset needed by the M0 prototypes is defined here; the
 * Supabase-generated types will replace these from M1 onward.
 */

export type ID = string;

export type SpaceKind = "solo_creator" | "community" | "studio" | "association";

export type SpaceRole = "owner" | "admin" | "staff" | "member";

export interface Space {
  id: ID;
  slug: string;
  kind: SpaceKind;
  name: string;
  city: string;
  tagline: string;
  verified: boolean;
  cover: CoverTone;
}

/** One-off / multi-session / recurring describe scheduling. Online and private are orthogonal flags. */
export type EventSchedule = "one_off" | "multi_session" | "recurring";

/** Multi-session: one booking covers the whole series. Recurring: booking per occurrence. */
export type BookingScope = "series" | "occurrence";

export type EventVisibility = "public" | "unlisted" | "private" | "members_only";

export type RegistrationMode = "native" | "external" | "manual_payment";

export type EventStatus = "draft" | "published" | "cancelled" | "archived";

export interface EventOccurrence {
  id: ID;
  startsAt: string; // ISO 8601 with offset
  endsAt: string;
  status: "scheduled" | "cancelled" | "rescheduled";
}

export interface TicketType {
  id: ID;
  name: string;
  /** Price in euro cents. 0 = free. */
  priceCents: number;
  capacity: number | null;
  sold: number;
}

export interface MekkoEvent {
  id: ID;
  slug: string;
  spaceId: ID;
  title: string;
  summary: string;
  description: string;
  categorySlug: string;
  schedule: EventSchedule;
  bookingScope: BookingScope;
  isOnline: boolean;
  visibility: EventVisibility;
  registrationMode: RegistrationMode;
  externalUrl?: string;
  status: EventStatus;
  city: string;
  /** Exact address is only revealed to signed-in users (see docs/M0_REVIEW.md #1). */
  address?: string;
  occurrences: EventOccurrence[];
  ticketTypes: TicketType[];
  capacity: number | null;
  materials: string[];
  cancellationPolicyCode: CancellationPolicyCode;
  cover: CoverTone;
}

export type CancellationPolicyCode = "flexible" | "moderate" | "strict" | "no_refund";

export interface CancellationPolicy {
  code: CancellationPolicyCode;
  title: string;
  summary: string;
}

export type IdeaGuideType = "photo" | "pdf" | "external";

export interface Idea {
  id: ID;
  slug: string;
  authorName: string;
  spaceId?: ID;
  title: string;
  summary: string;
  categorySlug: string;
  guideType: IdeaGuideType;
  priceCents: number;
  likes: number;
  saves: number;
  cover: CoverTone;
}

export type BookingStatus =
  "pending_payment" | "confirmed" | "waitlisted" | "cancelled_by_user" | "cancelled_by_organizer";

export interface Booking {
  id: ID;
  eventId: ID;
  /** null for series bookings (multi-session) – covers all occurrences. */
  occurrenceId: ID | null;
  quantity: number;
  status: BookingStatus;
  bookedAt: string;
}

export interface Category {
  slug: string;
  label: string;
}

export interface Notification {
  id: ID;
  kind: "booking_confirmed" | "event_reminder" | "event_changed" | "message" | "announcement";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ConversationPreview {
  id: ID;
  withName: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
}

/** Decorative cover palettes – stand-ins until real images are uploaded. */
export type CoverTone = "coral" | "sun" | "sage" | "lilac" | "sky" | "clay";
