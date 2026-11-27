import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import type { CoverTone } from "@/lib/data/events";
import type { CourseCardData } from "@/lib/data/courses";

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      href={`/tecaji/${course.slug}`}
      className="group block h-full overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand"
    >
      <div className="relative">
        <Cover tone={course.cover as CoverTone} className="h-32" />
        <div className="absolute top-3 left-3">
          <Badge tone="lilac">
            <Clapperboard aria-hidden="true" className="size-3" /> Posnet tečaj
          </Badge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg leading-snug font-bold break-words text-ink group-hover:text-brand-strong">
          {course.title}
        </h3>
        {course.summary && <p className="text-sm text-ink-muted">{course.summary}</p>}
        <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-muted">{course.space?.name}</span>
          <span className="font-semibold tabular-nums">
            {course.priceCents ? formatAmount(course.priceCents) : "Brezplačno"}
          </span>
        </p>
      </div>
    </Link>
  );
}
