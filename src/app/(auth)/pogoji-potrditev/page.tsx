import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { acceptTerms } from "@/lib/actions/profile";
import { SubmitButton } from "@/components/forms";
import { PageSkeleton } from "@/components/page-skeleton";

export const metadata: Metadata = { title: "Novi pogoji" };

export default function Page({ searchParams }: PageProps<"/pogoji-potrditev">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Pogoji uporabe in zasebnost</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/pogoji-potrditev">["searchParams"] }) {
  await requireUser({ allowTermsPending: true, next: "/pogoji-potrditev" });
  const sp = await searchParams;
  const naprej = typeof sp.naprej === "string" ? sp.naprej : "";
  return (
    <form action={acceptTerms} className="space-y-4" data-testid="terms-accept">
      <p>
        Pripravili smo{" "}
        <Link href="/pogoji" target="_blank" className="font-semibold text-brand-strong underline">
          Pogoje uporabe
        </Link>{" "}
        in{" "}
        <Link href="/zasebnost" target="_blank" className="font-semibold text-brand-strong underline">
          Politiko zasebnosti
        </Link>
        . Za nadaljnjo uporabo Mekka jih potrdi.
      </p>
      {sp.napaka && (
        <p role="alert" className="rounded-2xl bg-brand-soft p-3 text-sm text-brand-strong">
          Za nadaljevanje sprejmi Pogoje uporabe.
        </p>
      )}
      <input type="hidden" name="naprej" value={naprej} />
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="accept_terms"
          className="mt-1 size-5 shrink-0 accent-[var(--color-brand)]"
        />
        <span>Sprejemam Pogoje uporabe in potrjujem, da sem prebral/-a Politiko zasebnosti.</span>
      </label>
      <SubmitButton size="lg" pendingText="Shranjujem …">
        Potrdi in nadaljuj
      </SubmitButton>
    </form>
  );
}
