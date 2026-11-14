"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Compass, Plus, Smile, type LucideIcon } from "lucide-react";
import { activeVisitorTab, makeVisitorTabs, PROTO, type NavBase, type VisitorTabKey } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/logo";

const icons: Record<VisitorTabKey, LucideIcon> = {
  odkrivanje: Compass,
  "moje-aktivnosti": CalendarCheck,
  ustvari: Plus,
  "moj-mekko": Smile,
};

/**
 * The ONE visitor navigation element. Bottom tab bar on phones, left rail
 * from md up — the same DOM node, so there is never duplicated navigation.
 */
export function VisitorNav({ base = PROTO }: { base?: NavBase }) {
  const pathname = usePathname();
  const active = activeVisitorTab(pathname, base);
  const tabs = makeVisitorTabs(base);

  return (
    <nav
      aria-label="Glavna navigacija"
      data-testid="visitor-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:top-0 md:bottom-0 md:right-auto md:left-0 md:w-60 md:border-t-0 md:border-r md:pb-0"
    >
      <div className="hidden px-6 pt-12 pb-8 md:block">
        <Logo href={`${base}/odkrivanje`} />
      </div>
      <ul className="mx-auto grid max-w-lg grid-cols-4 md:mx-0 md:flex md:max-w-none md:flex-col md:gap-1 md:px-3">
        {tabs.map((tab) => {
          const Icon = icons[tab.key];
          const isActive = active === tab.key;
          const isCreate = tab.key === "ustvari";
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                data-testid={`tab-${tab.key}`}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] leading-tight font-semibold md:min-h-12 md:flex-row md:justify-start md:gap-3 md:rounded-2xl md:px-4 md:text-base",
                  isActive ? "text-brand-strong md:bg-brand-soft" : "text-ink-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center",
                    isCreate && "size-8 rounded-full bg-brand text-white md:size-7",
                  )}
                >
                  <Icon aria-hidden="true" className={isCreate ? "size-5" : "size-6"} strokeWidth={2.2} />
                </span>
                <span className="text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
