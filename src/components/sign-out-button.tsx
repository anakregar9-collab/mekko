import { signOut } from "@/app/(auth)/actions";
import { buttonClasses } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClasses("secondary", "md")}>
        Odjava
      </button>
    </form>
  );
}
