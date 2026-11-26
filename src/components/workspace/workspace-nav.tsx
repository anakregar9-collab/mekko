"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { WorkspaceLink } from "@/lib/navigation";
import { cn } from "@/lib/cn";

/** Client part of the workspace nav (needs the current path for aria-current). Rendered inside <Suspense>. */
export function WorkspaceNavLinks({ links }: { links: readonly WorkspaceLink[] }) {
  const pathname = usePathname();
  const params = useParams<{ space?: string }>();
  const resolve = (href: string) => href.replace(":space", params.space ?? "");
  return (
    <ul className="scroll-row flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {links.map((l) => {
        const href = l.href ? resolve(l.href) : null;
        const active = href === pathname;
        return (
          <li key={l.label} className="shrink-0">
            {href ? (
              <Link
                href={href}
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
  );
}
