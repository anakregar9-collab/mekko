import Link from "next/link";
import { Clock, Lightbulb } from "lucide-react";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import type { IdeaCardData } from "@/lib/data/ideas";

export function LiveIdeaCard({ idea }: { idea: IdeaCardData }) {
  return (
    <article className="group overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <Link href={`/ideje/${idea.slug}`} className="block focus-visible:outline-offset-[-3px]">
        <div className="relative">
          <Cover tone={idea.cover} imageUrl={idea.coverImageUrl} className="h-32 sm:h-40" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge tone="sun">
              <Lightbulb aria-hidden="true" className="size-3" /> Ideja
            </Badge>
            {idea.isDemo && (
              <Badge tone="neutral" className="bg-surface/95">
                Testna ideja
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-2 p-4">
          <h3 className="font-display text-lg leading-snug font-bold text-ink group-hover:text-brand-strong">
            {idea.title}
          </h3>
          {idea.summary && <p className="text-sm text-ink-muted">{idea.summary}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {idea.author && <span className="text-ink-muted">{idea.author}</span>}
            {idea.timeNeeded && (
              <span className="flex items-center gap-1 text-ink-muted">
                <Clock aria-hidden="true" className="size-4" /> {idea.timeNeeded}
              </span>
            )}
          </div>
          {(idea.beginner || idea.family) && (
            <div className="flex flex-wrap gap-1.5">
              {idea.beginner && <Badge tone="sage">Za začetnike</Badge>}
              {idea.family && <Badge tone="sun">Za otroke</Badge>}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
