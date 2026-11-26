import { AppHeader } from "@/components/visitor/app-header";
import { VisitorNav } from "@/components/visitor/visitor-nav";

export default function VisitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:pl-60">
      <AppHeader />
      <main id="vsebina" className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:px-8 md:pb-12">
        {children}
      </main>
      <VisitorNav />
    </div>
  );
}
