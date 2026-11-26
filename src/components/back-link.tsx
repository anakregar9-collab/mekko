import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-5" /> {children}
    </Link>
  );
}
