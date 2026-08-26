import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";

const CORPORATE_TITLE = "NexusPavilion Inc. | Corporate Home";
const CORPORATE_DESCRIPTION =
  "NexusPavilion Inc. is the parent company of NexusPavilion Intelligent Procurement, the primary live product for structured RFQ, quotation, supplier evaluation, award, activity, and executive procurement workflows. This corporate home presents the company and a scalable product portfolio.";

export const metadata: Metadata = {
  title: {
    absolute: CORPORATE_TITLE,
  },
  description: CORPORATE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: CORPORATE_TITLE,
    description: CORPORATE_DESCRIPTION,
    url: "/",
    siteName: "NexusPavilion Inc.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: CORPORATE_TITLE,
    description: CORPORATE_DESCRIPTION,
  },
};

const headerNavClass = [
  "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold",
  "text-nexus-text-secondary transition-[color,background-color] duration-200",
  "hover:bg-white/[0.06] hover:text-nexus-white",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

const headerProductClass = [
  "inline-flex min-h-11 items-center justify-center rounded-2xl",
  "border border-nexus-gold/30 bg-nexus-gold/10 px-4",
  "text-sm font-black text-nexus-gold-bright",
  "transition-[border-color,background-color] duration-200",
  "hover:border-nexus-gold/45 hover:bg-nexus-gold/15",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

const resourceLinkClass = [
  "inline-flex min-h-11 items-center text-sm font-bold text-nexus-cyan-bright",
  "underline-offset-4 hover:underline",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

export default function HomePage() {
  return (
    <main className="min-w-0 bg-nexus-navy text-nexus-white">
      <div className={EXECUTIVE_PAGE_CLASS}>
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            aria-label="NexusPavilion Inc. home"
            className={`inline-flex w-fit min-h-11 items-center rounded-xl ${EXECUTIVE_FOCUS_GOLD}`}
          >
            <NexusPavilionLogo variant="horizontal" size={72} priority />
          </Link>

          <nav aria-label="Corporate" className="min-w-0">
            <ul className="flex flex-wrap items-center gap-2">
              <li>
                <a href="#products-projects" className={headerNavClass}>
                  Products / Projects
                </a>
              </li>
              <li>
                <Link href="/about" className={headerNavClass}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className={headerNavClass}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/login" className={headerProductClass}>
                  Open Intelligent Procurement
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        <section
          aria-labelledby="corporate-hero-heading"
          className="np-region-major"
        >
          <ExecutivePanel variant="executive" padding="lg" tone="gold">
            <p className="np-type-eyebrow">NexusPavilion Inc.</p>

            <h1
              id="corporate-hero-heading"
              className="np-type-h1 mt-4 max-w-5xl text-balance"
            >
              Parent company for a scalable product portfolio.
            </h1>

            <p className="np-type-body mt-5 max-w-3xl text-base text-nexus-text-secondary">
              NexusPavilion Inc. is the parent company. NexusPavilion
              Intelligent Procurement is the primary live product. Company
              Workspace is the authenticated operating environment inside that
              product.
            </p>

            <ol className="mt-6 max-w-xl space-y-3 text-sm font-semibold leading-6 text-nexus-text-secondary">
              <li>NexusPavilion Inc.</li>
              <li>NexusPavilion Intelligent Procurement</li>
              <li>Company Workspace</li>
            </ol>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#products-projects" className={EXECUTIVE_CTA_PRIMARY}>
                Explore Products / Projects
              </a>
              <Link href="/login" className={EXECUTIVE_CTA_SECONDARY}>
                Open Intelligent Procurement
              </Link>
            </div>
          </ExecutivePanel>
        </section>

        <section
          aria-labelledby="company-context-heading"
          className="np-region-major"
        >
          <ExecutivePanel variant="boardroom" padding="lg">
            <p className="np-type-eyebrow">Company context</p>
            <h2 id="company-context-heading" className="np-type-h2 mt-3">
              A corporate home, not a procurement-only identity.
            </h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <ContextItem title="Parent company">
                NexusPavilion Inc. is the parent company represented by this
                corporate home.
              </ContextItem>
              <ContextItem title="Primary live product">
                NexusPavilion Intelligent Procurement is the primary live
                product available from this gateway.
              </ContextItem>
              <ContextItem title="Scalable portfolio">
                This corporate home is structured to support additional products
                and projects as they become live. No future product names are
                listed here.
              </ContextItem>
            </div>
          </ExecutivePanel>
        </section>

        <section
          id="products-projects"
          aria-labelledby="products-projects-heading"
          className="np-region-major scroll-mt-6"
        >
          <p className="np-type-eyebrow">Portfolio</p>
          <h2 id="products-projects-heading" className="np-type-h2 mt-3">
            Products / Projects
          </h2>
          <p className="np-type-body mt-3 max-w-3xl">
            At launch, one live product is available from NexusPavilion Inc.
          </p>

          <ExecutivePanel
            className="mt-6"
            variant="operational"
            padding="lg"
            tone="blue"
            radius="tile"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-muted">
                  NexusPavilion Inc. product
                </p>
                <h3 className="np-type-h3 mt-3 text-balance">
                  NexusPavilion Intelligent Procurement
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExecutiveBadge tone="live" size="md">
                  Live
                </ExecutiveBadge>
                <ExecutiveBadge tone="success" size="md">
                  Available Now
                </ExecutiveBadge>
              </div>
            </div>

            <p className="np-type-body mt-4 max-w-3xl">
              Structured RFQ, quotation, supplier evaluation, award, activity,
              and executive procurement workflows inside Company Workspace.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              <Link href="/login" className={`${EXECUTIVE_CTA_PRIMARY} w-fit`}>
                Open Intelligent Procurement
              </Link>
              <Link href="/signup" className={resourceLinkClass}>
                New to Intelligent Procurement? Get started
              </Link>
            </div>
          </ExecutivePanel>
        </section>

        <section
          aria-labelledby="company-resources-heading"
          className="np-region-major"
        >
          <ExecutivePanel variant="boardroom" padding="lg">
            <p className="np-type-eyebrow">Trust</p>
            <h2 id="company-resources-heading" className="np-type-h2 mt-3">
              Company resources
            </h2>
            <p className="np-type-body mt-3 max-w-3xl">
              Public destinations currently available from NexusPavilion Inc.
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ResourceLink href="/about">About</ResourceLink>
              <ResourceLink href="/contact">Contact</ResourceLink>
              <ResourceLink href="/pricing">
                Intelligent Procurement Pricing
              </ResourceLink>
              <ResourceLink href="/privacy">Privacy</ResourceLink>
              <ResourceLink href="/terms">Terms</ResourceLink>
            </ul>
          </ExecutivePanel>
        </section>
      </div>
    </main>
  );
}

function ContextItem({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-base font-black text-nexus-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-7 text-nexus-muted">
        {children}
      </p>
    </div>
  );
}

function ResourceLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={[
          "flex min-h-14 items-center rounded-2xl border border-white/10 bg-white/[0.045] px-4",
          "text-sm font-bold text-nexus-white",
          "transition-[border-color,background-color] duration-200",
          "hover:border-[#2CC4E8]/25 hover:bg-white/[0.08]",
          EXECUTIVE_FOCUS_CYAN,
        ].join(" ")}
      >
        {children}
      </Link>
    </li>
  );
}
