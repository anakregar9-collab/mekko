import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { liveSpaceLinks } from "@/lib/navigation";
import { getMySpaces } from "@/lib/auth/dal";
import { SpaceSwitcher } from "@/components/workspace/space-switcher";

export default function SpaceLayout({ children }: LayoutProps<"/organizator/[space]">) {
  return (
    <WorkspaceShell
      title="Organizator"
      label="Navigacija organizatorja"
      links={liveSpaceLinks}
      backHref="/moj-mekko"
      switcher={
        <Suspense fallback={<div className="h-11 animate-pulse rounded-xl bg-cream" />}>
          <Switcher />
        </Suspense>
      }
    >
      {children}
    </WorkspaceShell>
  );
}

async function Switcher() {
  const spaces = (await getMySpaces()).filter((s) => s.status === "active");
  return <SpaceSwitcher spaces={spaces.map((s) => ({ slug: s.space.slug, name: s.space.name }))} />;
}
