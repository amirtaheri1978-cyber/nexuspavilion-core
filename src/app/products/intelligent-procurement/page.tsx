import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-about.module.css";
import { corporateSocialProfiles } from "@/components/corporate/corporate-social-profiles";
import productStyles from "./product.module.css";

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
  "Intelligent Procurement Platform | Nexus Pavilion Inc.";
const PRODUCT_DESCRIPTION =
  "Construction procurement software for RFQ management, supplier quotation comparison, commercial evaluation and award records. Request a demo.";
const PRODUCT_URL = "https://nexuspavilion.com/products/intelligent-procurement";

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
    locale: "en_CA",
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

const productQuestions = [
  {
    question: "What is Intelligent Procurement?",
    answer:
      "Intelligent Procurement by Nexus Pavilion Inc. is a web-based construction procurement platform for RFQ management, supplier responses, commercial evaluation and recorded award decisions. A Company Workspace manages company identity and roles separately from participation in an RFQ.",
  },
  {
    question: "Who can use it for material purchasing?",
    answer:
      "Construction buying teams, including specialty contractors purchasing materials after a project award, can explore the buyer workflow. General contractors and material suppliers purchasing inputs or outsourcing work can discuss their use case in a demo. An invited supplier responding to an RFQ has a different role from the buyer evaluating quotations.",
  },
  {
    question: "How does construction RFQ management work?",
    answer:
      "A request for quotation (RFQ) sets the sourcing context. Authorized participants manage invitations and supplier responses, then review commercial information at the applicable opening stage. Company membership alone does not grant participation in an RFQ.",
  },
  {
    question: "How does supplier quotation comparison support a decision?",
    answer:
      "Supplier quote comparison brings commercial responses into an authorized evaluation workflow. Review price together with the quoted scope, delivery terms, inclusions and exclusions before recording a selection rationale. Commercial information remains confidential before the applicable opening point; missing or different quote assumptions still need buyer clarification.",
  },
  {
    question: "Does an award record replace a contract or purchase order?",
    answer:
      "No. A procurement decision trail records the selection context and rationale. An award record does not execute a legal contract, purchase order or notice to proceed. Professional judgment and formal contracting obligations remain separate responsibilities.",
  },
  {
    question: "How can I request a demo?",
    answer:
      "Use the Nexus Pavilion corporate contact form, select Product Inquiry and describe a representative material RFQ or supplier-comparison workflow. Demo availability, supported scope and access are confirmed individually. Existing invited users can use the application login.",
  },
] as const;

const productJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nexuspavilion.com/#organization",
      name: "Nexus Pavilion Inc.",
      url: "https://nexuspavilion.com",
      logo: "https://nexuspavilion.com/branding/logo-icon-1024.png",
      sameAs: corporateSocialProfiles.map(({ href }) => href),
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${PRODUCT_URL}#software`,
      name: "Intelligent Procurement",
      url: PRODUCT_URL,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Construction procurement software",
      operatingSystem: "Web",
      creator: { "@id": "https://nexuspavilion.com/#organization" },
      description: PRODUCT_DESCRIPTION,
      featureList: [
        "Company Workspace administration",
        "RFQ management and authorized supplier invitations",
        "Supplier responses and quotation comparison",
        "Commercial evaluation with opening-stage controls",
        "Procurement award decision records",
      ],
    },
    {
      "@type": "WebPage",
      "@id": PRODUCT_URL,
      name: PRODUCT_TITLE,
      url: PRODUCT_URL,
      description: PRODUCT_DESCRIPTION,
      inLanguage: "en-CA",
      mainEntity: { "@id": `${PRODUCT_URL}#software` },
      breadcrumb: { "@id": `${PRODUCT_URL}#breadcrumb` },
      isPartOf: {
        "@type": "WebSite",
        name: "Nexus Pavilion Inc.",
        url: "https://nexuspavilion.com",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PRODUCT_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Nexus Pavilion Inc.", item: "https://nexuspavilion.com" },
        { "@type": "ListItem", position: 2, name: "Intelligent Procurement", item: PRODUCT_URL },
      ],
    },
  ],
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
            Intelligent Procurement Platform
          </h1>
          <div className={styles.introductionCopy}>
            <p>
              Construction procurement software for buying teams that need a
              clear path from material RFQs to supplier quotation comparison,
              commercial evaluation and an explained award decision.
            </p>
            <span>LIVE / ACCESS BY INVITATION</span>
          </div>
          <div className={productStyles.heroActions}>
            <Link href="/contact">Request a demo <span aria-hidden="true">→</span></Link>
            <a href="#procurement-questions">Explore the procurement workflow</a>
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
            <div className={styles.productStatus}>LIVE</div>
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
          id="procurement-questions"
          className={styles.building}
          aria-labelledby="procurement-questions-heading"
        >
          <header className={styles.buildingHeader}>
            <SectionMarker index="06">BUYER QUESTIONS</SectionMarker>
            <h2 id="procurement-questions-heading">From material purchasing to a decision you can explain.</h2>
          </header>
          <div className={productStyles.questions}>
            {productQuestions.map(({ question, answer }) => (
              <article key={question} className={productStyles.answer}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.contactClose}
          aria-labelledby="product-contact-heading"
        >
          <p>EXPLORE THE WORKFLOW</p>
          <h2 id="product-contact-heading">
            Bring one material RFQ. Explore the decision workflow.
          </h2>
          <Link href="/contact">
            Request a demo <span aria-hidden="true">→</span>
          </Link>
          <p className={productStyles.accessNote}>
            Select Product Inquiry in the contact form. Access and demo scope are
            confirmed individually. <a href="https://procurement.nexuspavilion.com/login">Invited-user login</a>
          </p>
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
