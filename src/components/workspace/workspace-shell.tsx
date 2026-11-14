import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import type { WorkspaceLink } from "@/lib/navigation";
import { Logo } from "@/components/logo";
import { WorkspaceNavLinks } from "@/components/workspace/workspace-nav";

/**
 * Shared shell for organizer and admin workspaces: desktop-optimised sidebar,
 * becomes a horizontally scrollable tab strip on phones. One <nav> element only.
 */
export function WorkspaceShell({
  title,
  label,
  links,
  switcher,
  backHref = "/prototip/moj-mekko",
  children,
}: {
  backHref?: string;
  title: string;
  label: string;
  links: readonly WorkspaceLink[];
  switcher?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="z-20 border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:pt-6 lg:pb-4">
          <div className="flex min-w-0 items-center gap-2 lg:mb-4">
            <Logo href={backHref.startsWith("/prototip") ? "/prototip/odkrivanje" : "/odkrivanje"} />
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-cream">{title}</span>
          </div>
          <Link
            href={backHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink lg:mb-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> <span>V Mekko</span>
          </Link>
        </div>
        {switcher && <div className="px-4 pb-3 lg:px-5 lg:pb-4">{switcher}</div>}
        <nav aria-label={label} data-testid="workspace-nav">
          <Suspense fallback={<div className="h-13 px-3 pb-2" />}>
            <WorkspaceNavLinks links={links} />
          </Suspense>
        </nav>
      </aside>
      <main id="vsebina" className="min-w-0 px-4 py-5 lg:px-10 lg:py-8">
        {children}
      </main>
    </div>
  );
}
