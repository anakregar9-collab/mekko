import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { UnreadNotificationsBadge } from "@/components/visitor/unread-badge";
import { conversations, notifications } from "@/lib/demo/data";

/** Visitor header: logo (phones only — desktop rail shows it) + TWO separate icons (PRODUCT_SPEC §2, §7). */
export function AppHeader({ base = "/prototip" }: { base?: "" | "/prototip" }) {
  // Real unread counts arrive with messaging/notifications (M2/M3); the prototype shows demo counts.
  const isDemo = base === "/prototip";
  const unreadMessages = isDemo ? conversations.reduce((n, c) => n + c.unread, 0) : 0;
  const unreadNotifications = isDemo ? notifications.filter((n) => !n.read).length : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">
        <div className="md:invisible">
          <Logo href={`${base}/odkrivanje`} />
        </div>
        <div className="flex items-center gap-1">
          <HeaderIcon
            href={`${base}/sporocila`}
            label="Sporočila"
            count={unreadMessages}
            testId="header-messages"
          >
            <MessageCircle aria-hidden="true" className="size-6" />
          </HeaderIcon>
          <HeaderIcon
            href={`${base}/obvestila`}
            label="Obvestila"
            count={unreadNotifications}
            testId="header-notifications"
            live={
              isDemo ? undefined : (
                <Suspense fallback={null}>
                  <UnreadNotificationsBadge />
                </Suspense>
              )
            }
          >
            <Bell aria-hidden="true" className="size-6" />
          </HeaderIcon>
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({
  href,
  label,
  count,
  testId,
  live,
  children,
}: {
  href: string;
  label: string;
  count: number;
  testId: string;
  /** Live (request-time) badge; when set, the label is visually hidden text so the badge is announced too. */
  live?: React.ReactNode;
  children: React.ReactNode;
}) {
  const accessible = count > 0 ? `${label}, ${count} neprebranih` : label;
  return (
    <Link
      href={href}
      aria-label={live ? undefined : accessible}
      data-testid={testId}
      className="relative flex size-11 items-center justify-center rounded-full text-ink hover:bg-brand-soft"
    >
      {children}
      {live && <span className="sr-only">{label}</span>}
      {live}
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.65rem] leading-5 font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
