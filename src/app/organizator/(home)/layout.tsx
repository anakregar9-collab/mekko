import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { liveOrganizerHomeLinks } from "@/lib/navigation";

export default function OrganizerHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell
      title="Organizator"
      label="Navigacija organizatorja"
      links={liveOrganizerHomeLinks}
      backHref="/moj-mekko"
    >
      {children}
    </WorkspaceShell>
  );
}
