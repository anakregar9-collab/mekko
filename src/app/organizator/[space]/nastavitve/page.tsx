import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSpaceRole } from "@/lib/auth/dal";
import { PageSkeleton } from "@/components/page-skeleton";
import { SpaceSettingsForm } from "./space-settings-form";
import { LegalInfoForm } from "./legal-info-form";
import { createClient } from "@/lib/supabase/server";
import type { LegalForm } from "@/lib/spaces";

export const metadata: Metadata = { title: "Nastavitve prostora" };

export default function Page({ params }: PageProps<"/organizator/[space]/nastavitve">) {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Nastavitve prostora</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/organizator/[space]/nastavitve">["params"] }) {
  const { space: slug } = await params;
  const { space } = await requireSpaceRole(slug, "admin");
  const supabase = await createClient();
  const { data: legal } = await supabase
    .from("space_legal_info")
    .select("legal_name, address, registration_number, contact_email")
    .eq("space_id", space.id)
    .maybeSingle();
  return (
    <div className="space-y-6">
      <SpaceSettingsForm
        slug={slug}
        initial={{
          name: space.name,
          city: space.city ?? "",
          tagline: space.tagline ?? "",
          bio: space.bio ?? "",
        }}
      />
      <LegalInfoForm
        slug={slug}
        initial={{
          legal_form: (space.legal_form as LegalForm | null) ?? "",
          legal_name: legal?.legal_name ?? "",
          address: legal?.address ?? "",
          registration_number: legal?.registration_number ?? "",
          contact_email: legal?.contact_email ?? "",
        }}
      />
    </div>
  );
}
