import { Ban } from "lucide-react";
import { setBlocked } from "@/lib/actions/messages";
import { SubmitButton } from "@/components/forms";

/** Block / unblock a person. Blocking stops messages both ways; existing bookings stay valid (DECISIONS #9). */
export function BlockButton({
  profileId,
  blocked,
  back,
  name,
}: {
  profileId: string;
  blocked: boolean;
  back: string;
  name: string;
}) {
  return (
    <form action={setBlocked}>
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="block" value={blocked ? "0" : "1"} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton variant="ghost" size="sm" pendingText="…">
        <Ban aria-hidden="true" className="size-4" />
        {blocked ? `Odblokiraj ${name}` : `Blokiraj ${name}`}
      </SubmitButton>
    </form>
  );
}
