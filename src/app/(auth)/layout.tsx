import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <div className="mb-8">
        <Logo href="/odkrivanje" />
      </div>
      <main id="vsebina" className="flex-1">
        {children}
      </main>
    </div>
  );
}
