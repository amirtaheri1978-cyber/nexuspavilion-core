import Image from "next/image";
import Link from "next/link";

import StatusBadge from "@/components/ui/StatusBadge";
import { CompanyCapabilitiesDisplay } from "@/components/company-capabilities-display";
import { CompanyQualificationsDisplay } from "@/components/company-qualifications-display";
import {
  createEmptyGroupedCapabilities,
  hasAnyGroupedCapabilities,
  loadCompanyCapabilities,
} from "@/lib/company/capabilities";
import {
  createEmptyGroupedQualifications,
  hasAnyPublicGroupedQualifications,
  loadPublicCompanyQualifications,
} from "@/lib/company/qualifications";
import { createClient } from "@/lib/supabase/server";

type StatusBadgeValue = "SANDBOX" | "PENDING" | "APPROVED" | "REJECTED";

type Company = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  location: string | null;
  network_role: string | null;
  status: string | null;
  logo_url: string | null;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeStatus(status: string | null): StatusBadgeValue {
  const value = String(status || "").toLowerCase();

  if (value === "verified" || value === "approved") return "APPROVED";
  if (value === "pending") return "PENDING";
  if (value === "rejected") return "REJECTED";

  return "SANDBOX";
}

export default async function PublicCompanyPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("company_directory")
    .select("id, name, slug, category, location, network_role, status, logo_url")
    .eq("slug", slug)
    .in("status", ["approved", "verified"])
    .limit(1);

  const company = data?.[0] as Company | undefined;

  if (!company) {
    return (
      <SystemState
        eyebrow="Public Company Profile"
        title="Company profile unavailable."
        description="This company profile does not exist, is not approved for public visibility, or is no longer available in the NexusPavilion directory."
        primaryHref="/directory"
        primaryLabel="Back to Directory"
        secondaryHref="/"
        secondaryLabel="Home"
      />
    );
  }

  let companyCapabilities = createEmptyGroupedCapabilities();
  let companyQualifications = createEmptyGroupedQualifications();

  try {
    companyCapabilities = await loadCompanyCapabilities(supabase, company.id);
  } catch (error) {
    console.error("Public company capabilities lookup failed.", {
      companyId: company.id,
      slug,
      error,
    });
  }

  try {
    companyQualifications = await loadPublicCompanyQualifications(
      supabase,
      company.id,
    );
  } catch (error) {
    console.error("Public company qualifications lookup failed.", {
      companyId: company.id,
      slug,
      error,
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="mx-auto w-full max-w-[1680px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/directory"
            className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            ← Back to Public Directory
          </Link>

          <Link
            href="/rfq"
            className="inline-flex w-fit rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 transition"
          >
            Open Procurement Center
          </Link>
        </div>

        <section className="mt-8 rounded-[40px] border border-white/10 bg-white/[0.065] p-7 shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-6">
              {company.logo_url ? (
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 shrink-0 rounded-3xl border border-white/10 bg-white object-contain p-2"
                />
              ) : (
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] text-4xl font-black text-slate-400"
                  aria-hidden="true"
                >
                  {company.name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
                  Public Company Profile
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="max-w-4xl min-w-0 break-words text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                    {company.name}
                  </h1>

                  <StatusBadge status={normalizeStatus(company.status)} />
                </div>

                <p className="mt-4 min-w-0 break-words text-lg font-semibold text-slate-300">
                  {company.category?.trim() || "Not specified"} ·{" "}
                  {company.location?.trim() || "Location N/A"}
                </p>

                <p className="mt-2 min-w-0 break-words text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                  {company.network_role?.trim() || "Not specified"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {hasAnyGroupedCapabilities(companyCapabilities) ? (
          <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <CompanyCapabilitiesDisplay
              capabilities={companyCapabilities}
              variant="public"
            />
          </section>
        ) : null}

        {hasAnyPublicGroupedQualifications(companyQualifications) ? (
          <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <CompanyQualificationsDisplay
              qualifications={companyQualifications}
              variant="public"
            />
          </section>
        ) : null}

        <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-black uppercase tracking-[0.30em] text-[#C8A646]">
            Public Data Boundary
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Access Restricted
          </h2>

          <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Company Network discovery publishes organization identity, public
            capabilities, and qualifications this company has chosen to share.
            Submitted quotes, supplier pricing, commercial evaluation, supplier
            ranking, recommendation signals, award values, and workspace
            administration are not published on public company profiles.
            Authorized procurement users review commercial evidence only through
            governed issuer workspaces after commercial opening.
          </p>
        </section>
      </div>
    </main>
  );
}

function SystemState({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061426] px-4 py-10 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <section className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-white/[0.065] p-8 text-center shadow-[0_36px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-[#C8A646]">
          {eyebrow}
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
          {title}
        </h1>

        <p className="mt-5 text-base font-semibold leading-8 text-slate-300">
          {description}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href={primaryHref}
            className="flex h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition"
          >
            {primaryLabel}
          </Link>

          <Link
            href={secondaryHref}
            className="flex h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
          >
            {secondaryLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
