import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-privacy.module.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-corporate-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-corporate-body", display: "swap" });

const PRIVACY_TITLE = "Privacy | Nexus Pavilion Inc.";
const PRIVACY_DESCRIPTION = "Privacy information for Nexus Pavilion Inc. and its Intelligent Procurement product.";

export const metadata: Metadata = {
  title: { absolute: PRIVACY_TITLE },
  description: PRIVACY_DESCRIPTION,
  robots: {
    index: false,
    follow: true,
  },
};

const documentIndex = [
  ["01", "Scope"],
  ["02", "Information handled"],
  ["03", "How information is used"],
  ["04", "Product and workspace data"],
  ["05", "Operational processing"],
  ["06", "Security and access"],
  ["07", "Analytics and intelligent outputs"],
  ["08", "Cookies, storage, and tracking"],
  ["09", "Retention"],
  ["10", "Access, correction, and complaints"],
  ["11", "Accountability"],
  ["12", "Organization responsibilities"],
  ["13", "Policy changes"],
] as const;

const policySections = [
  {
    number: "01",
    id: "scope",
    title: "Scope",
    content: (
      <>
        <p>This privacy information is provided by Nexus Pavilion Inc. It describes the information handled through this corporate website and, where stated, through Intelligent Procurement, a Nexus Pavilion Inc. product currently in development.</p>
        <p>References to procurement workspaces, RFQs, quotations, suppliers, and procurement intelligence apply to Intelligent Procurement rather than to every activity or future product of Nexus Pavilion Inc.</p>
      </>
    ),
  },
  {
    number: "02",
    id: "information-handled",
    title: "Information handled",
    content: (
      <>
        <p>The corporate contact workflow handles the name, email address, company, inquiry type, and message submitted by a visitor.</p>
        <p>Intelligent Procurement handles account and organization information and may contain company profiles, membership and invitation records, RFQs, supplier submissions, documents, procurement activity, notifications, and related workspace records created through the product.</p>
      </>
    ),
  },
  {
    number: "03",
    id: "information-use",
    title: "How information is used",
    content: (
      <>
        <p>Information submitted through the corporate contact workflow is used to route and respond to the inquiry.</p>
        <p>Within Intelligent Procurement, information is used to authenticate users, operate organization workspaces, support sourcing and collaboration workflows, deliver product communications, enforce access boundaries, and produce the views and outputs requested through the product.</p>
      </>
    ),
  },
  {
    number: "04",
    id: "workspace-data",
    title: "Product and workspace data",
    content: (
      <>
        <p>Procurement records belong to the context in which participating organizations and authorized users create or receive them. Workspace membership, lifecycle state, and product authorization rules determine which records and actions are available to a user.</p>
        <p>Commercial quotation evidence is subject to additional visibility controls. Operational submission counts and commercial quotation content are treated as distinct evidence within the current product.</p>
      </>
    ),
  },
  {
    number: "05",
    id: "operational-processing",
    title: "Operational processing",
    content: (
      <>
        <p>The current service uses hosted authentication and data infrastructure, transactional email delivery, and limited error monitoring to operate supported workflows.</p>
        <p>Nexus Pavilion Inc. uses third-party service providers, including an email-delivery provider (currently Resend), to transmit and process contact inquiries on its behalf.</p>
        <p>Contact messages are routed through the configured email-delivery service. Product sessions use authentication cookies required to maintain signed-in access. Error monitoring is configured to exclude default personal information, user information, cookies, request and response headers and bodies, URL query parameters, AI inputs and outputs, and database-query data.</p>
      </>
    ),
  },
  {
    number: "06",
    id: "security-access",
    title: "Security and access governance",
    content: (
      <>
        <p>Intelligent Procurement uses authenticated sessions, organization membership, role-aware authorization, and database access policies to govern product access. These controls are designed to limit workspace information to the users and organizations permitted by the relevant workflow.</p>
        <p>No technical system can be described as risk-free. Questions about access or unexpected information exposure should be reported through the corporate contact channel.</p>
      </>
    ),
  },
  {
    number: "07",
    id: "analytics-intelligence",
    title: "Analytics and intelligent outputs",
    content: (
      <>
        <p>Intelligent Procurement may generate analytics, evidence summaries, reports, and AI-assisted narratives from information that is available to an authorized workspace user. Product controls separate operational evidence, commercial evidence, and completed-procurement evidence.</p>
        <p>These outputs are intended to support—not replace—professional judgment. Their scope and usefulness depend on the evidence available for the relevant population and purpose.</p>
      </>
    ),
  },
  {
    number: "08",
    id: "cookies-storage-tracking",
    title: "Cookies, browser storage, and tracking",
    content: (
      <>
        <p>On the anonymous Corporate website, advertising or analytics cookies or similar tracking technologies are not currently used.</p>
        <p>Within Intelligent Procurement, strictly necessary authentication technologies may be used to maintain signed-in sessions and secure access to product workspaces.</p>
        <p>Submitting the corporate contact form does not create a marketing or analytics cookie. Submitted information is transmitted through the configured email-delivery provider.</p>
        <p>Limited technical error monitoring may operate when errors occur, under the existing privacy-preserving configuration described in this policy.</p>
        <p>Any future addition of optional analytics, advertising, profiling, or similar tracking must trigger a new privacy and consent review before activation.</p>
      </>
    ),
  },
  {
    number: "09",
    id: "retention",
    title: "Retention",
    content: (
      <p>Personal information is retained only for as long as reasonably necessary for the purposes for which it was collected, subject to applicable legal, security, dispute-resolution, and record-keeping requirements.</p>
    ),
  },
  {
    number: "10",
    id: "access-correction-complaints",
    title: "Access, correction, and complaints",
    content: (
      <p>Individuals may contact Nexus Pavilion Inc. to request access to personal information held about them, request correction of inaccurate or incomplete information, or raise a privacy concern or complaint, subject to applicable law.</p>
    ),
  },
  {
    number: "11",
    id: "accountability",
    title: "Accountability",
    content: (
      <p>Privacy matters for Nexus Pavilion Inc. may be directed to the Privacy Officer — Nexus Pavilion Inc. at contact@nexuspavilion.com.</p>
    ),
  },
  {
    number: "12",
    id: "responsibilities",
    title: "Organization and user responsibilities",
    content: (
      <p>Organizations and users are responsible for maintaining appropriate account access, managing invitations and membership roles, protecting credentials, and ensuring that information submitted through a workspace is accurate and appropriate for the intended collaboration.</p>
    ),
  },
  {
    number: "13",
    id: "policy-changes",
    title: "Policy changes",
    content: (
      <p>This page may be revised as the corporate website, Intelligent Procurement, and their supporting operations evolve. Material policy details should be read from the current published version of this page.</p>
    ),
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <div className={styles.architecture} aria-hidden="true"><span /><span /></div>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Nexus Pavilion Inc. home">
            <NexusPavilionLogo variant="icon" size={42} priority />
            <span>Nexus Pavilion Inc.</span>
          </Link>
          <span className={styles.chapter}>LEGAL / PRIVACY</span>
        </header>

        <section className={styles.introduction} aria-labelledby="privacy-heading">
          <div className={styles.documentIdentity}>
            <p>DOCUMENT / 01</p>
            <span>CORPORATE POLICY</span>
            <span>Effective September 22, 2026</span>
            <span>Last updated September 22, 2026</span>
          </div>
          <div className={styles.introductionMain}>
            <p className={styles.eyebrow}>PRIVACY</p>
            <h1 id="privacy-heading">Privacy, with context preserved.</h1>
            <p className={styles.lead}>Nexus Pavilion Inc. operates this corporate website and is the corporate owner of Intelligent Procurement. This page explains the information handled by the current website and product implementation without extending product-specific practices into unsupported corporate claims.</p>
          </div>
        </section>

        <div className={styles.documentLayout}>
          <aside className={styles.documentRail} aria-label="Privacy document index">
            <p>DOCUMENT INDEX</p>
            <ol>
              {documentIndex.map(([number, label]) => (
                <li key={number}><span>{number}</span><a href={`#${policySections[Number(number) - 1].id}`}>{label}</a></li>
              ))}
            </ol>
            <div className={styles.productContext}>
              <p>PRODUCT CONTEXT</p>
              <strong>Intelligent Procurement</strong>
              <span>IN DEVELOPMENT</span>
            </div>
          </aside>

          <article className={styles.policy} aria-label="Privacy policy">
            {policySections.map((section) => (
              <section key={section.number} id={section.id} className={styles.policySection} aria-labelledby={`${section.id}-heading`}>
                <span className={styles.sectionNumber}>{section.number}</span>
                <div>
                  <h2 id={`${section.id}-heading`}>{section.title}</h2>
                  <div className={styles.sectionCopy}>{section.content}</div>
                </div>
              </section>
            ))}
          </article>
        </div>

        <section className={styles.contactClose} aria-labelledby="privacy-contact-heading">
          <div>
            <p>PRIVACY CONTACT</p>
            <h2 id="privacy-contact-heading">Questions deserve a clear route.</h2>
          </div>
          <div className={styles.contactAction}>
            <p>Privacy Officer — Nexus Pavilion Inc. · contact@nexuspavilion.com. Use the corporate contact channel for privacy questions, access concerns, or unexpected information exposure.</p>
            <Link href="/contact">Contact Nexus Pavilion <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
