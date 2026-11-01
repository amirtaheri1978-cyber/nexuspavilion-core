import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-terms.module.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-corporate-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-corporate-body", display: "swap" });

const TERMS_TITLE = "Terms | Nexus Pavilion Inc.";
const TERMS_DESCRIPTION = "Terms for Nexus Pavilion Inc. services, Global Construction Network, and Intelligent Procurement.";

export const metadata: Metadata = {
  title: { absolute: TERMS_TITLE },
  description: TERMS_DESCRIPTION,
  robots: { index: false, follow: true },
};

const clauses = [
  {
    number: "01", id: "scope", label: "Scope and acceptance",
    content: <><p>These Terms describe the operating boundaries for the applicable websites and services provided by Nexus Pavilion Inc., including Global Construction Network and, where expressly identified, Intelligent Procurement. References to Intelligent Procurement identify a Nexus Pavilion Inc. product currently in development.</p><p>Provisions concerning procurement workspaces, RFQs, suppliers, quotations, analytics, and related workflows apply specifically to Intelligent Procurement. They do not describe every activity or future product of Nexus Pavilion Inc.</p></>,
  },
  {
    number: "02", id: "accounts-access", label: "Accounts and authorized access",
    content: <><p>Users are responsible for protecting their account credentials and for using the services only through access they are authorized to hold.</p><p>Organizations are responsible for managing their users, invitations, memberships, and role assignments, and for ensuring that access remains appropriate for their work.</p></>,
  },
  {
    number: "03", id: "product-workspaces", label: "Intelligent Procurement workspaces",
    content: <><p>Intelligent Procurement supports organization workspaces and procurement workflows involving RFQs, supplier participation, quotations, documents, evaluation activity, communications, and related records.</p><p>Access to workspace records and actions depends on organization context, membership, role, lifecycle state, and the authorization rules applicable to the relevant workflow.</p></>,
  },
  {
    number: "04", id: "commercial-decisions", label: "Procurement and commercial decisions",
    content: <><p>RFQs, supplier submissions, evaluations, negotiations, procurement decisions, and contract awards remain the responsibility of the participating organizations.</p><p>Intelligent Procurement provides workflow and intelligence support. It does not make an organization&apos;s commercial, procurement, or award decision for it.</p></>,
  },
  {
    number: "05", id: "information-accuracy", label: "Information and data accuracy",
    content: <><p>Users and organizations are responsible for the accuracy and appropriateness of the information they submit, including company information, procurement requirements, supplier information, quotations, budgets, and related records.</p><p>Views and outputs produced by the services depend on the information and evidence available for the relevant purpose.</p></>,
  },
  {
    number: "06", id: "intelligent-outputs", label: "Analytics and intelligent outputs",
    content: <><p>Intelligent Procurement may present analytics, forecasts, scores, evidence summaries, reports, and decision-support narratives based on information available to an authorized user.</p><p>These outputs support—and do not replace—professional judgment. They may be incomplete, inaccurate, or unsuitable for a particular decision and should be reviewed against the underlying evidence and professional judgment. Their relevance and usefulness depend on the scope, quality, and availability of that evidence. The services do not make autonomous decisions on behalf of an organization.</p></>,
  },
  {
    number: "07", id: "acceptable-use", label: "Acceptable use",
    content: <p>Users must not use the applicable website or services for unlawful purposes; attempt unauthorized access; circumvent security or access controls; introduce malicious code; interfere with or disrupt the services; or attempt to obtain procurement or workspace information they are not authorized to access.</p>,
  },
  {
    number: "08", id: "intellectual-property", label: "Intellectual property",
    content: <><p>Nexus Pavilion Inc. retains applicable rights in its website, services, software, branding, and first-party materials, subject to third-party and open-source rights.</p><p>Nexus Pavilion Inc. does not acquire ownership of customer or user procurement data merely because that data is submitted to the service. Users and organizations provide only the limited rights reasonably necessary for Nexus Pavilion Inc. to host, process, transmit, secure, and operate submitted content for the applicable service.</p></>,
  },
  {
    number: "09", id: "confidential-information", label: "Confidential and authorized information",
    content: <p>Users must use confidential, procurement, and workspace information only within their authorized relationship and workflow. This obligation does not shift all platform-security responsibility to users.</p>,
  },
  {
    number: "10", id: "service-evolution", label: "Service evolution and availability",
    content: <><p>Features and workflows may evolve as Nexus Pavilion Inc. develops its services and products. A service or feature may also be temporarily unavailable during maintenance, security work, infrastructure changes, or other operational activity.</p><p>This section describes how the services may evolve; it does not create an uptime or availability commitment.</p></>,
  },
  {
    number: "11", id: "gcn-directory", label: "Global Construction Network directory",
    content: <><p>These provisions supplement the other sections of these Terms for Global Construction Network, a curated industry information and discovery platform operated by Nexus Pavilion Inc. They do not alter rights or obligations under a separate binding agreement for a paid service.</p><h3>Independent editorial listings</h3><p>Nexus Pavilion may independently select, create, classify, publish, update, correct, restrict, suspend, or remove free organization listings and related event, project, product, and industry information. Editorial actions may occur with or without prior notice, subject to applicable law and binding contractual obligations. Inclusion, classification, placement, visibility, and continued publication are not guaranteed. Nexus Pavilion may decline a request to add or reinstate a free listing, subject to applicable law and binding obligations.</p><h3>No implied relationship</h3><p>Inclusion of an organization, its activities, or its products does not, by itself, create membership, a contract with that organization, agency, partnership, sponsorship, affiliation, approval, or endorsement by Nexus Pavilion. A reference to participation in an event or project describes the reported underlying relationship; it does not imply a commercial relationship with Nexus Pavilion. A free editorial listing creates no entitlement to continued publication.</p><h3>Sources and accuracy</h3><p>Directory information may be drawn from official organizational and event sources, public industry materials, authorized submissions, and other lawfully accessible sources. Nexus Pavilion makes reasonable editorial efforts to identify supporting evidence and correct material inaccuracies, but information from third parties may be incomplete, inaccurate, or outdated. A “source-supported” record or relationship means that identified source material supports the information displayed within the stated scope of review as of the review date. It is not an independent audit or guarantee of subsequent accuracy. Status indicators do not establish accreditation, professional certification, regulatory approval, endorsement, or independent verification of an organization’s qualifications, products, or performance.</p><p>Directory information is provided for industry discovery and general information. Users should confirm facts material to professional, technical, safety, purchasing, or commercial decisions with the organization, relevant authority, or other appropriate primary source.</p><h3>Third-party rights</h3><p>Names, trademarks, logos, photographs, website text, documents, and other third-party materials remain subject to their owners’ rights. These Terms neither transfer those rights nor grant Nexus Pavilion permission to reproduce protected material. Nexus Pavilion may make factual references and use third-party material only where it has permission or another lawful basis.</p><h3>Corrections and removal requests</h3><p>An organization, individual, or rights holder may request review of a listing, correction of information, or removal of material by emailing <a href="mailto:contact@nexuspavilion.com">contact@nexuspavilion.com</a>. A request should identify the record or material, the requested action, and supporting information. Nexus Pavilion may seek information reasonably necessary to establish the requester’s identity or authority and will assess the request under applicable law, relevant rights, evidence, and editorial policies. A request does not guarantee a particular outcome except where required by law or a binding obligation. Requests concerning an individual’s personal information are also handled under the <Link href="/privacy">Privacy Policy</Link>.</p><h3>Free and paid services</h3><p>Free editorial listings are distinct from contracted subscriptions, enhanced profiles, advertising, sponsored placement, and other paid services. The applicable agreement governs paid deliverables, duration, termination, and other contractual rights. Editorial removal discretion under this section does not override a binding paid-service obligation. Paid or sponsored content will be identified where required by applicable law; payment does not establish independent editorial endorsement.</p><h3>Responsibility and liability</h3><p>The responsibility and liability limitations elsewhere in these Terms apply to use of Global Construction Network to the extent their wording covers the relevant claim and applicable law permits. This section creates no additional exclusion of liability and does not limit any right or remedy that cannot lawfully be excluded or limited.</p></>,
  },
  {
    number: "12", id: "responsibility-boundary", label: "Responsibility and liability boundary",
    content: <><p>To the maximum extent permitted by applicable law, Nexus Pavilion Inc. shall not be liable for indirect, incidental, special, consequential, or business losses arising from use of the applicable services or procurement decisions made by users.</p><p>Nothing in these Terms excludes or limits any right or remedy that cannot lawfully be excluded or limited.</p></>,
  },
  {
    number: "13", id: "governing-law", label: "Governing law",
    content: <p>These Terms are governed by the laws of the Province of Ontario and the applicable federal laws of Canada.</p>,
  },
  {
    number: "14", id: "terms-changes", label: "Terms changes and contact",
    content: <><p>These Terms may be revised as the corporate website, Global Construction Network, Intelligent Procurement, and their supporting operations evolve. Publishing an updated version of this page does not, by itself, constitute acceptance of every material contractual change.</p><p>Material changes affecting registered or service users may require additional notice or acceptance where appropriate or required by law. Questions about these Terms may be directed through the Nexus Pavilion Inc. corporate contact channel.</p></>,
  },
] as const;

export default function TermsPage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <div className={styles.architecture} aria-hidden="true"><span /><span /><i /></div>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Nexus Pavilion Inc. home">
            <span className={styles.brandReturn} aria-hidden="true">←</span>
            <NexusPavilionLogo variant="icon" size={42} priority />
            <span>Nexus Pavilion Inc.</span>
          </Link>
          <span className={styles.chapter}>LEGAL / TERMS</span>
        </header>

        <section className={styles.introduction} aria-labelledby="terms-heading">
          <div className={styles.agreementIdentity}>
            <p>AGREEMENT / 01</p>
            <span>OPERATING BOUNDARIES</span>
            <span>Effective September 22, 2026</span>
            <span>Last updated October 31, 2026</span>
          </div>
          <div className={styles.introductionMain}>
            <p className={styles.eyebrow}>TERMS</p>
            <h1 id="terms-heading">Terms, precisely framed.</h1>
            <p className={styles.lead}>These Terms set out the operating boundaries for applicable services provided by Nexus Pavilion Inc. Product-specific provisions are identified as relating to Intelligent Procurement, a Nexus Pavilion Inc. product currently in development.</p>
          </div>
        </section>

        <div className={styles.agreementLayout}>
          <aside className={styles.agreementRail} aria-label="Terms clause index">
            <p>CLAUSE INDEX</p>
            <ol>{clauses.map((clause) => <li key={clause.number}><span>{clause.number}</span><a href={`#${clause.id}`}>{clause.label}</a></li>)}</ol>
            <div className={styles.productContext}><p>PRODUCT CONTEXT</p><strong>Intelligent Procurement</strong><span>IN DEVELOPMENT</span></div>
          </aside>

          <article className={styles.agreement} aria-label="Terms of service">
            {clauses.map((clause) => (
              <section key={clause.number} id={clause.id} className={styles.clause} aria-labelledby={`${clause.id}-heading`}>
                <div className={styles.clauseMarker}><span>{clause.number}</span><i aria-hidden="true" /></div>
                <div><h2 id={`${clause.id}-heading`}>{clause.label}</h2><div className={styles.clauseCopy}>{clause.content}</div></div>
              </section>
            ))}
          </article>
        </div>

        <section className={styles.contactClose} aria-labelledby="terms-contact-heading">
          <div><p>CORPORATE CONTACT</p><h2 id="terms-contact-heading">A clear boundary begins with a clear question.</h2></div>
          <div className={styles.contactAction}><p>Use the corporate contact channel for questions about these Terms or the services to which they apply.</p><Link href="/contact">Contact Nexus Pavilion <span aria-hidden="true">→</span></Link></div>
        </section>
      </div>
    </main>
  );
}
