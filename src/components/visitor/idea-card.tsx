import { Bookmark, ExternalLink, FileText, Heart, Image as ImageIcon } from "lucide-react";
import type { Idea } from "@/lib/domain/types";
import { Cover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";

const guideLabel = {
  pdf: { label: "PDF navodila", Icon: FileText },
  external: { label: "Zunanji vodič", Icon: ExternalLink },
  photo: { label: "Foto + opis", Icon: ImageIcon },
} as const;

/** Idea preview. Detail pages for ideas arrive in M4, so this card is intentionally not a link. */
export function IdeaCard({ idea }: { idea: Idea }) {
  const guide = guideLabel[idea.guideType];
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
      <div className="relative">
        <Cover tone={idea.cover} className="h-28" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone="neutral" className="bg-surface/95">
            Ideja
          </Badge>
          <Badge tone="sun">
            <guide.Icon aria-hidden="true" className="size-3" /> {guide.label}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-lg leading-snug font-bold">{idea.title}</h3>
        <p className="text-sm text-ink-muted">
          {idea.authorName} · {idea.summary}
        </p>
        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="font-semibold">{formatPrice(idea.priceCents)}</span>
          <span className="flex items-center gap-3 text-ink-muted">
            <span className="flex items-center gap-1">
              <Heart aria-hidden="true" className="size-4" />
              <span className="sr-only">Všečki:</span> {idea.likes}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark aria-hidden="true" className="size-4" />
              <span className="sr-only">Shranjeno:</span> {idea.saves}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
