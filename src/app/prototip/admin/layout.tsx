import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { adminLinks } from "@/lib/navigation";

export default function AdminLayout({ children }: LayoutProps<"/prototip/admin">) {
  return (
    <WorkspaceShell title="Admin" label="Navigacija administracije" links={adminLinks}>
      {children}
    </WorkspaceShell>
  );
}
