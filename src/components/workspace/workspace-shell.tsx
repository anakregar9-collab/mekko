"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { WorkspaceLink } from "@/lib/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

/**
 * Shared shell for organizer and admin workspaces: desktop-optimised sidebar,
 * becomes a horizontally scrollable tab strip on phones. One <nav> element only.
 */
export function WorkspaceShell({
  title,
  label,
  links,
  switcher,
  children,
}: {
  title: string;
  label: string;
  links: readonly WorkspaceLink[];
  switcher?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="z-20 border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:pt-6 lg:pb-4">
          <div className="flex min-w-0 items-center gap-2 lg:mb-4">
            <Logo />
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-cream">{title}</span>
          </div>
          <Link
            href="/prototip/moj-mekko"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink lg:mb-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> <span>V Mekko</span>
          </Link>
          {switcher && <div className="hidden lg:block">{switcher}</div>}
        </div>
        {switcher && <div className="px-4 pb-3 lg:hidden">{switcher}</div>}
        <nav aria-label={label} data-testid="workspace-nav">
          <ul className="scroll-row flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {links.map((l) => {
              const active = l.href === pathname;
              return (
                <li key={l.label} className="shrink-0">
                  {l.href ? (
                    <Link
                      href={l.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold whitespace-nowrap",
                        active ? "bg-brand-soft text-brand-strong" : "text-ink hover:bg-cream",
                      )}
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-sm whitespace-nowrap text-ink-muted"
                    >
                      {l.label}
                      <span className="rounded-full bg-cream px-1.5 text-[0.65rem] font-semibold">
                        {l.milestone}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main id="vsebina" className="min-w-0 px-4 py-5 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
