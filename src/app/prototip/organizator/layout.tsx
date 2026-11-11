import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { organizerLinks } from "@/lib/navigation";

export default function OrganizerLayout({ children }: LayoutProps<"/prototip/organizator">) {
  return (
    <WorkspaceShell
      title="Organizator"
      label="Navigacija organizatorja"
      links={organizerLinks}
      switcher={
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-muted">Prostor</span>
          <select
            className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold"
            defaultValue="sp-glina"
            aria-describedby="switcher-note"
          >
            <option value="sp-glina">Glinena hiša · studio</option>
            <option value="sp-ana">Ana Riše · ustvarjalka</option>
          </select>
          <span id="switcher-note" className="sr-only">
            V prototipu menjava prostora ne spremeni prikaza.
          </span>
        </label>
      }
    >
      {children}
    </WorkspaceShell>
  );
}
