import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-about.module.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-corporate-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-corporate-body",
  display: "swap",
});

const PRODUCT_TITLE =
  "Intelligent Procurement by Nexus Pavilion Inc. | Procurement Intelligence";
const PRODUCT_DESCRIPTION =
  "Intelligent Procurement by Nexus Pavilion Inc. is an in-development procurement intelligence product for company workspace administration, RFQ workflows, supplier responses, commercial evaluation, and governed award decisions.";

export const metadata: Metadata = {
  title: { absolute: PRODUCT_TITLE },
  description: PRODUCT_DESCRIPTION,
  alternates: { canonical: "/products/intelligent-procurement" },
  robots: { index: true, follow: true },
  openGraph: {
    title: PRODUCT_TITLE,
    description: PRODUCT_DESCRIPTION,
    url: "/products/intelligent-procurement",
    siteName: "Nexus Pavilion Inc.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/branding/og-image.png",
        width: 1200,
        height: 630,
        alt: "Intelligent Procurement by Nexus Pavilion Inc.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_TITLE,
    description: PRODUCT_DESCRIPTION,
    images: ["/branding/og-image.png"],
  },
};

const productPrinciples = [
  {
    index: "01",
    title: "Company Workspace",
    detail:
      "Company identity, membership, workspace roles, and operating context are administered separately from procurement participation.",
  },
  {
    index: "02",
    title: "RFQ workflows",
    detail:
      "Authorized participants can structure sourcing, manage RFQ invitations, and coordinate supplier response workflows within governed access boundaries.",
  },
  {
    index: "03",
    title: "Commercial evaluation",
    detail:
      "Commercial information is evaluated within procurement-stage controls, preserving confidentiality before the applicable commercial opening point.",
  },
  {
    index: "04",
    title: "Governed award decisions",
    detail:
      "Award recording supports a governed procurement decision trail; it does not itself constitute an executed legal contract, purchase order, or notice to proceed.",
  },
] as const;

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Intelligent Procurement by Nexus Pavilion Inc.",
  url: "https://nexuspavilion.com/products/intelligent-procurement",
  description: PRODUCT_DESCRIPTION,
  isPartOf: {
    "@type": "WebSite",
    name: "Nexus Pavilion Inc.",
    url: "https://nexuspavilion.com",
  },
  about: {
    "@type": "SoftwareApplication",
    name: "Intelligent Procurement",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    creator: {
      "@type": "Organization",
      name: "Nexus Pavilion Inc.",
      url: "https://nexuspavilion.com",
    },
    description:
      "An in-development procurement intelligence product organized around Company Workspace administration and governed procurement workflows.",
  },
};

export default function IntelligentProcurementPage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <div className={styles.architecture} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.shell}>
        <header className={styles.header}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="Nexus Pavilion Inc. corporate home"
          >
            <span className={styles.brandReturn} aria-hidden="true">
              ←
            </span>
            <NexusPavilionLogo variant="icon" size={42} priority />
            <span>Nexus Pavilion Inc.</span>
          </Link>
          <span className={styles.chapter}>PRODUCT / 01</span>
        </header>

        <section
          className={styles.introduction}
          aria-labelledby="intelligent-procurement-heading"
        >
          <p className={styles.eyebrow}>
            INTELLIGENT PROCUREMENT BY NEXUS PAVILION INC.
          </p>
          <h1 id="intelligent-procurement-heading">
            Procurement intelligence built around governed decisions.
          </h1>
          <div className={styles.introductionCopy}>
            <p>
              Intelligent Procurement is an in-development product for
              organizations that need clearer control across company workspace
              administration, RFQ sourcing, supplier responses, commercial
              evaluation, and governed award decisions.
            </p>
            <span>IN DEVELOPMENT</span>
          </div>
        </section>

        <section
          className={styles.operatingIdea}
          aria-labelledby="product-operating-heading"
        >
          <SectionMarker index="02">OPERATING MODEL</SectionMarker>
          <div className={styles.operatingEditorial}>
            <h2 id="product-operating-heading">
              Company identity and procurement execution are related, not
              interchangeable.
            </h2>
            <div className={styles.operatingCopy}>
              <p>
                The Company Workspace governs organization identity, membership,
                workspace roles, and operating context. Workspace invitations
                establish company membership; they do not grant RFQ
                participation by themselves.
              </p>
              <p>
                Procurement workflows govern RFQ invitations, quotations,
                evaluation, and award decisions as separate business flows.
                Access, terminology, and evidence remain scoped to the specific
                procurement domain.
              </p>
            </div>
          </div>
        </section>

        <section
          className={styles.building}
          aria-labelledby="product-capabilities-heading"
        >
          <header className={styles.buildingHeader}>
            <SectionMarker index="03">PRODUCT SCOPE</SectionMarker>
            <h2 id="product-capabilities-heading">
              Structured around consequential procurement work.
            </h2>
          </header>

          <ol className={styles.principles}>
            {productPrinciples.map((principle) => (
              <li key={principle.title}>
                <span>{principle.index}</span>
                <h3>{principle.title}</h3>
                <p>{principle.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.productArchitecture}
          aria-labelledby="product-architecture-heading"
        >
          <div className={styles.productParent}>
            <p>CORPORATE PARENT</p>
            <h2>Nexus Pavilion Inc.</h2>
            <span>
              Focused software and decision-intelligence systems for complex
              real-world environments
            </span>
          </div>

          <div className={styles.productLine} aria-hidden="true">
            <span />
            <i />
          </div>

          <div className={styles.product}>
            <p>PRODUCT / 01</p>
            <div className={styles.productStatus}>IN DEVELOPMENT</div>
            <h2 id="product-architecture-heading">Intelligent Procurement</h2>
            <p className={styles.productStatement}>
              The product is operated on its own application boundary at
              procurement.nexuspavilion.com. Corporate discovery content remains
              on nexuspavilion.com, while authenticated company and procurement
              data remain outside public discovery surfaces.
            </p>
          </div>
        </section>

        <section
          className={styles.direction}
          aria-labelledby="product-direction-heading"
        >
          <SectionMarker index="05">DECISION DISCIPLINE</SectionMarker>
          <div>
            <h2 id="product-direction-heading">
              Preserve context, confidentiality, and accountable action.
            </h2>
            <p>
              Intelligent Procurement is designed to make procurement evidence
              more legible without collapsing distinct business domains or
              exposing private commercial information. The product supports
              governed decisions; professional judgment and formal contracting
              obligations remain separate responsibilities.
            </p>
          </div>
        </section>

        <section
          className={styles.contactClose}
          aria-labelledby="product-contact-heading"
        >
          <p>PRODUCT INQUIRIES</p>
          <h2 id="product-contact-heading">
            Start with the procurement problem you need to govern more clearly.
          </h2>
          <Link href="/contact">
            Contact Nexus Pavilion <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

function SectionMarker({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionMarker}>
      <span>{index}</span>
      <p>{children}</p>
    </div>
  );
}
