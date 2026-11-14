import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { liveAdminLinks } from "@/lib/navigation";
import { requirePlatformRole } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";

const STAFF = ["super_admin", "admin", "moderator", "finance", "support"] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <WorkspaceShell
      title="Admin"
      label="Navigacija administracije"
      links={liveAdminLinks}
      backHref="/moj-mekko"
    >
      <Suspense fallback={<PageSkeleton />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </WorkspaceShell>
  );
}

/** Non-staff get a 404 (we don't reveal the admin area exists). Every page and action re-checks its own role. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requirePlatformRole([...STAFF]);
  return <>{children}</>;
}
