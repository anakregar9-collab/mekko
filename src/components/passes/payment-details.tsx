import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/** How to pay the organizer: their own instructions and/or their own payment link. Mekko never handles the money. */
export function PaymentDetails({
  instructions,
  link,
  label = "Plačilo organizatorju",
}: {
  instructions: string | null;
  link: string | null;
  label?: string;
}) {
  if (!instructions && !link) return null;
  return (
    <div className="space-y-2 rounded-2xl bg-sun-soft p-3 text-sm text-sun-ink" data-testid="payment-details">
      <p className="font-semibold">{label}</p>
      {instructions && <p className="break-words whitespace-pre-line">{instructions}</p>}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={buttonClasses("secondary", "sm")}
        >
          Plačaj prek povezave organizatorja <ExternalLink aria-hidden="true" className="size-4" />
          <span className="sr-only">(odpre zunanjo stran)</span>
        </a>
      )}
      <p className="text-xs">Plačilo gre neposredno organizatorju, ne prek Mekka.</p>
    </div>
  );
}
