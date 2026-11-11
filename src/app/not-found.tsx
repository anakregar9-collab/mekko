import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-extrabold">Strani ni bilo mogoče najti</h1>
      <p className="text-ink-muted">Morda je bila odstranjena ali pa je povezava napačna.</p>
      <Link href="/" className="font-semibold text-brand-strong underline">
        Na začetek
      </Link>
    </main>
  );
}
