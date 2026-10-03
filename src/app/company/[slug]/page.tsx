import Image from "next/image";
import Link from "next/link";

import { CompanyCapabilitiesDisplay } from "@/components/company-capabilities-display";
import { CompanyQualificationsDisplay } from "@/components/company-qualifications-display";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  createEmptyGroupedCapabilities,
  loadCompanyCapabilities,
} from "@/lib/company/capabilities";
import {
  createEmptyGroupedQualifications,
  loadPublicCompanyQualifications,
} from "@/lib/company/qualifications";
import {
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/server";

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

function publicCompanyStatus(status: string | null): {
  label: string;
  tone: "success" | "pending" | "neutral";
} {
  const value = String(status || "").toLowerCase();

  if (value === "verified") {
    return { label: "Verified", tone: "success" };
  }

  if (value === "approved") {
    return { label: "Approved", tone: "success" };
  }

  if (value === "pending") {
    return { label: "Pending", tone: "pending" };
  }

  return { label: "Unavailable", tone: "neutral" };
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
      <main className={EXECUTIVE_PAGE_CLASS}>
        <ExecutivePanel variant="operational" padding="lg" tone="gold">
          <p className="np-type-eyebrow text-nexus-gold">
            Public Company Profile
          </p>

          <h1 className="np-type-h1 mt-4 max-w-4xl min-w-0 text-pretty text-nexus-white">
            Company profile unavailable.
          </h1>

          <p className="np-type-body mt-5 max-w-3xl min-w-0 text-pretty text-nexus-muted">
            This company profile does not exist, is not approved for public
            visibility, or is no longer available in the NexusPavilion directory.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/directory" className={EXECUTIVE_CTA_SECONDARY}>
              Back to Directory
            </Link>
            <Link href="/" className={EXECUTIVE_BUTTON_TERTIARY}>
              Home
            </Link>
          </div>
        </ExecutivePanel>
      </main>
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

  const status = publicCompanyStatus(company.status);
  const category = company.category?.trim() || "Not specified";
  const location = company.location?.trim() || "Location not specified";
  const networkRole = company.network_role?.trim() || "Not specified";

  return (
    <main className={EXECUTIVE_PAGE_CLASS}>
      <ExecutivePanel
        variant="operational"
        padding="lg"
        tone="gold"
        aria-labelledby="public-company-name"
      >
        <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start">
          {company.logo_url ? (
            <Image
              src={company.logo_url}
              alt={`${company.name} logo`}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-executive border border-white/10 bg-white object-contain p-2"
            />
          ) : (
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-executive border border-white/10 bg-white/[0.055] text-4xl font-black text-nexus-muted"
              aria-hidden="true"
            >
              {company.name.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="np-type-eyebrow text-nexus-gold">
              Public Company Profile
            </p>

            <h1
              id="public-company-name"
              className="np-type-h1 mt-3 max-w-4xl min-w-0 break-words text-pretty text-nexus-white"
            >
              {company.name}
            </h1>

            <p className="np-type-body mt-4 min-w-0 break-words text-pretty text-nexus-text-secondary">
              {category}
              <span className="mx-2 text-nexus-muted">·</span>
              {location}
            </p>

            <p className="np-type-meta mt-3 min-w-0 break-words text-nexus-muted">
              Network role: {networkRole}
            </p>

            <div className="mt-5">
              <ExecutiveBadge tone={status.tone} size="md">
                {status.label}
              </ExecutiveBadge>
            </div>
          </div>
        </div>
      </ExecutivePanel>

      <ExecutivePanel
        variant="operational"
        padding="lg"
        className="np-region"
        aria-labelledby="public-company-capabilities"
      >
        <CompanyCapabilitiesDisplay
          capabilities={companyCapabilities}
          variant="public"
          headingId="public-company-capabilities"
        />
      </ExecutivePanel>

      <ExecutivePanel
        variant="operational"
        padding="lg"
        className="np-region"
        aria-labelledby="public-company-qualifications"
      >
        <CompanyQualificationsDisplay
          qualifications={companyQualifications}
          variant="public"
          headingId="public-company-qualifications"
        />
      </ExecutivePanel>

      <ExecutivePanel
        variant="operational"
        padding="lg"
        className="np-region"
        aria-labelledby="public-data-boundary"
      >
        <p className="np-type-eyebrow text-nexus-gold">Public Data Boundary</p>

        <h2
          id="public-data-boundary"
          className="np-type-h2 mt-3 text-nexus-white"
        >
          Access Restricted
        </h2>

        <p className="np-type-body mt-4 max-w-4xl min-w-0 text-pretty text-nexus-muted">
          Company Network discovery publishes organization identity, public
          capabilities, and qualifications this company has chosen to share.
          Submitted quotes, supplier pricing, commercial evaluation, rankings
          and recommendations, award values, and workspace administration are
          not published on public company profiles.
        </p>
      </ExecutivePanel>

      <nav
        aria-label="Public company profile"
        className="np-region flex flex-wrap gap-3"
      >
        <Link href="/directory" className={EXECUTIVE_CTA_SECONDARY}>
          Back to Public Directory
        </Link>
        <Link href="/rfq" className={EXECUTIVE_BUTTON_TERTIARY}>
          Open Procurement Center
        </Link>
      </nav>
    </main>
  );
}
