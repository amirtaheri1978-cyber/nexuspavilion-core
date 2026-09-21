import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-about.module.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-corporate-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-corporate-body", display: "swap" });

const ABOUT_TITLE = "Company | Nexus Pavilion Inc.";
const ABOUT_DESCRIPTION = "Nexus Pavilion Inc. builds focused AI and software systems for complex real-world environments.";

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
  openGraph: { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, url: "/about", siteName: "Nexus Pavilion Inc.", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: ABOUT_TITLE, description: ABOUT_DESCRIPTION },
};

const buildingPrinciples = [
  { index: "01", title: "Context", detail: "Understand the environment before defining the system." },
  { index: "02", title: "Domain expertise", detail: "Ground technology in the realities of professional work." },
  { index: "03", title: "Systems", detail: "Connect evidence, operations, and infrastructure deliberately." },
  { index: "04", title: "Consequence", detail: "Measure intelligence by the quality of the decisions it supports." },
] as const;

export default function AboutPage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <div className={styles.architecture} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Nexus Pavilion Inc. home">
            <NexusPavilionLogo variant="icon" size={42} priority />
            <span>Nexus Pavilion Inc.</span>
          </Link>
          <span className={styles.chapter}>COMPANY / 01</span>
        </header>

        <section className={styles.introduction} aria-labelledby="company-heading">
          <p className={styles.eyebrow}>NEXUS PAVILION INC.</p>
          <h1 id="company-heading">Intelligence shaped for the systems that shape the world.</h1>
          <div className={styles.introductionCopy}>
            <p>Nexus Pavilion Inc. builds focused AI and software systems for complex real-world environments—where information, operations, infrastructure, and professional judgment must work together.</p>
            <span>Ontario, Canada</span>
          </div>
        </section>

        <section className={styles.operatingIdea} aria-labelledby="operating-idea-heading">
          <SectionMarker index="02">OPERATING IDEA</SectionMarker>
          <div className={styles.operatingEditorial}>
            <h2 id="operating-idea-heading">Context is not background. It is part of the system.</h2>
            <div className={styles.operatingCopy}>
              <p>Useful intelligence begins before abstraction. It starts by understanding how data relates to operations, physical infrastructure, domain expertise, and the people accountable for a decision.</p>
              <p>We design for that whole environment. Evidence should remain legible, judgment should remain present, and technology should clarify consequence rather than conceal it.</p>
            </div>
          </div>
        </section>

        <section className={styles.building} aria-labelledby="building-heading">
          <header className={styles.buildingHeader}>
            <SectionMarker index="03">HOW WE BUILD</SectionMarker>
            <h2 id="building-heading">From situated knowledge to consequential action.</h2>
          </header>
          <ol className={styles.principles}>
            {buildingPrinciples.map((principle) => (
              <li key={principle.title}>
                <span>{principle.index}</span>
                <h3>{principle.title}</h3>
                <p>{principle.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.productArchitecture} aria-labelledby="product-heading">
          <div className={styles.productParent}>
            <p>CORPORATE ARCHITECTURE / 01</p>
            <h2>Nexus Pavilion Inc.</h2>
            <span>Focused AI and software systems</span>
          </div>
          <div className={styles.productLine} aria-hidden="true"><span /><i /></div>
          <div className={styles.product}>
            <p>PRODUCT / 01</p>
            <div className={styles.productStatus}>IN DEVELOPMENT</div>
            <h2 id="product-heading">Intelligent Procurement</h2>
            <p className={styles.productStatement}>An AI-assisted procurement intelligence product designed to help teams structure sourcing workflows, evaluate commercial information, and make consequential procurement decisions with greater context and control.</p>
          </div>
        </section>

        <section className={styles.direction} aria-labelledby="direction-heading">
          <SectionMarker index="05">LONG-TERM DIRECTION</SectionMarker>
          <div>
            <h2 id="direction-heading">Build carefully. Expand only where understanding is earned.</h2>
            <p>Our longer horizon is not defined by adding technology everywhere. It is defined by finding the environments where context, evidence, and professional judgment can be made more coherent—and building focused systems worthy of the decisions they inform.</p>
          </div>
        </section>

        <section className={styles.contactClose} aria-labelledby="contact-close-heading">
          <p>START A CONVERSATION</p>
          <h2 id="contact-close-heading">Complex work deserves a clear beginning.</h2>
          <Link href="/contact">Contact Nexus Pavilion <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  );
}

function SectionMarker({ index, children }: { index: string; children: React.ReactNode }) {
  return <div className={styles.sectionMarker}><span>{index}</span><p>{children}</p></div>;
}
