import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import CorporateHeroVisual from "@/components/corporate/corporate-hero-visual";
import CorporateIndustriesMotion from "@/components/corporate/corporate-industries-motion";
import CorporateTechnologyMotion from "@/components/corporate/corporate-technology-motion";
import styles from "@/components/corporate/corporate-home.module.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-corporate-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-corporate-body", display: "swap" });

const CORPORATE_TITLE = "NexusPavilion Inc. | Corporate Home";
const CORPORATE_DESCRIPTION =
  "NexusPavilion Inc. is the parent company of NexusPavilion Intelligent Procurement and builds focused AI products that turn complexity into decisive intelligence.";

export const metadata: Metadata = {
  title: { absolute: CORPORATE_TITLE },
  description: CORPORATE_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { title: CORPORATE_TITLE, description: CORPORATE_DESCRIPTION, url: "/", siteName: "NexusPavilion Inc.", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: CORPORATE_TITLE, description: CORPORATE_DESCRIPTION },
};

const navigation = [
  { label: "Company", href: "/about" },
  { label: "Technology", href: "#technology" },
  { label: "Industries", href: "#industries" },
  { label: "Products", href: "#products-projects" },
  { label: "Contact", href: "/contact" },
] as const;

export default function HomePage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <section className={styles.heroChapter} aria-label="NexusPavilion Inc. introduction">
        <CorporateHeroVisual />
        <div className={styles.aurora} aria-hidden="true" />
        <div className={styles.scan} aria-hidden="true" />
        <div className={styles.mask} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />

        <div className={styles.shell}>
          <header className={styles.header}>
            <Link href="/" className={styles.brand} aria-label="NexusPavilion Inc. home">
              <span className={styles.logoWrap}>
                <NexusPavilionLogo variant="icon" size={48} priority />
              </span>
              <span className={styles.brandName}>NexusPavilion Inc.</span>
            </Link>
            <nav className={styles.navigation} aria-label="Corporate">
              {navigation.map((item) => <Link key={item.label} href={item.href}>{item.label}</Link>)}
            </nav>
          </header>

          <div className={styles.hero}>
            <section id="technology" className={styles.copy} aria-labelledby="corporate-hero-heading">
              <p className={styles.kicker}>Real systems · brighter tomorrows</p>
              <h1 id="corporate-hero-heading">Turning complexity into decisive intelligence.</h1>
              <p className={styles.lead}>We build focused AI products that transform complex data, operations, infrastructure, and human expertise into clearer decisions and measurable real-world outcomes.</p>
              <div className={styles.actions}>
                <Link className={styles.primary} href="#technology">Explore Technology</Link>
                <Link className={styles.secondary} href="#products-projects">View Products</Link>
              </div>
            </section>

            <aside className={styles.hud} aria-hidden="true">
              <div>Models<br />in motion</div>
              <div>Better<br />decisions</div>
              <div>Real-world<br />impact</div>
            </aside>

            <div className={styles.bottom} aria-hidden="true">
              <div className={styles.pager}><span>01 / 04</span><span className={styles.line} /></div>
              <div className={styles.topics}><span>Industries</span><span>People</span><span>Planet</span><span>Progress</span></div>
            </div>
          </div>
          <span id="products-projects" className={styles.anchorTarget} />
        </div>
      </section>

      <section id="corporate-thesis" className={styles.thesis} aria-labelledby="corporate-thesis-heading">
        <div className={styles.thesisInner}>
          <div className={styles.thesisEditorial}>
            <p className={styles.thesisEyebrow}>OUR OPERATING IDEA</p>
            <h2 id="corporate-thesis-heading">Digital intelligence should move with the physical world.</h2>
            <p className={styles.thesisCopy}>Nexus Pavilion Inc. builds focused AI and software systems for complex real-world environments. We connect data, operations, infrastructure, and domain expertise into coherent decision systems—preserving context, causality, and professional judgment rather than reducing them to isolated signals. Our role is to make complexity more legible, strengthen the path from evidence to action, and create products whose intelligence is measured by the quality of decisions and outcomes they enable.</p>
            <p className={styles.thesisStatement}>Intelligence matters when it improves what happens next.</p>
          </div>

          <figure className={styles.system} aria-labelledby="system-caption">
            <div className={styles.systemInputs}>
              <span>DATA</span>
              <span>OPERATIONS</span>
              <span>INFRASTRUCTURE</span>
              <span>DOMAIN EXPERTISE</span>
            </div>
            <div className={styles.systemConvergence} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className={styles.systemOutcome}>DECISION INTELLIGENCE</div>
            <figcaption id="system-caption">EVIDENCE → CONTEXT → ACTION</figcaption>
          </figure>
        </div>
      </section>

      <section
        id="corporate-technology"
        className={styles.technology}
        aria-labelledby="corporate-technology-heading"
        data-technology-section
      >
        <CorporateTechnologyMotion />
        <div className={styles.technologyInner}>
          <div className={styles.technologyEditorial}>
            <p className={styles.technologyEyebrow}>HOW INTELLIGENCE TAKES SHAPE</p>
            <h2 id="corporate-technology-heading">Context before computation. Intelligence before action.</h2>
            <p className={styles.technologyCopy}>Nexus Pavilion Inc. designs AI and software systems around the realities in which decisions are made. We begin with context—how signals relate to operations, constraints, infrastructure, and domain expertise—then structure those relationships into intelligence that can be examined, understood, and acted upon. The objective is not simply to produce more information, but to create decision systems that preserve meaning, expose consequence, and support deliberate action.</p>
          </div>

          <figure className={styles.technologyField} aria-labelledby="technology-progression-caption">
            <div className={styles.fieldCoordinates} aria-hidden="true">
              <span>43.07° N</span>
              <span>FIELD 03</span>
            </div>
            <svg className={styles.fieldDrawing} viewBox="0 0 760 590" aria-hidden="true">
              <defs>
                <linearGradient id="technology-path" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#70dff5" stopOpacity=".72" />
                  <stop offset=".63" stopColor="#dce9ee" stopOpacity=".38" />
                  <stop offset="1" stopColor="#d8b96f" stopOpacity=".74" />
                </linearGradient>
                <filter id="technology-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>
              <path className={styles.fieldPlane} d="M70 104 545 42 700 175 218 238Z" />
              <path className={styles.fieldPlane} d="M126 344 518 265 670 410 275 501Z" />
              <path className={styles.fieldGuide} d="M74 104 126 344M545 42 518 265M700 175 670 410M218 238 275 501" />
              <path className={styles.fieldPath} d="M92 152 C226 78 250 257 365 212 S510 289 626 203 S650 358 607 432" />
              <path className={styles.fieldGlow} d="M92 152 C226 78 250 257 365 212 S510 289 626 203 S650 358 607 432" />
              <circle className={styles.fieldNode} cx="92" cy="152" r="4" />
              <circle className={styles.fieldNode} cx="365" cy="212" r="4" />
              <circle className={styles.fieldNode} cx="626" cy="203" r="4" />
              <circle className={styles.fieldDecisionNode} cx="607" cy="432" r="5" />
              <circle className={styles.fieldPulse} cx="92" cy="152" r="4" />
            </svg>
            <ol className={styles.fieldStages}>
              <li><span>01</span><strong>SIGNALS</strong><small>Observed conditions</small></li>
              <li><span>02</span><strong>RELATIONSHIPS</strong><small>Dependencies preserved</small></li>
              <li><span>03</span><strong>CONTEXT</strong><small>Meaning structured</small></li>
              <li><span>04</span><strong>DECISION</strong><small>Consequence made legible</small></li>
            </ol>
            <figcaption id="technology-progression-caption">SIGNALS → RELATIONSHIPS → CONTEXT → DECISION</figcaption>
          </figure>

          <div className={styles.technologyPrinciples}>
            <article>
              <p>01 / CONTEXT</p>
              <h3>Understand the system before interpreting the signal.</h3>
              <span>Data becomes useful when its relationships, constraints, and operating conditions are preserved.</span>
            </article>
            <article>
              <p>02 / INTELLIGENCE</p>
              <h3>Turn relationships into decision-grade understanding.</h3>
              <span>Evidence, uncertainty, dependencies, and domain knowledge are structured into a coherent view of what matters.</span>
            </article>
            <article>
              <p>03 / ACTION</p>
              <h3>Make intelligence usable at the moment of decision.</h3>
              <span>Outputs are designed to be examined, challenged, and applied—not merely observed.</span>
            </article>
          </div>

          <p className={styles.technologyStatement}>From signal to context. From context to consequence.</p>
        </div>
      </section>

      <section
        id="industries"
        className={styles.industries}
        aria-labelledby="corporate-industries-heading"
        data-industries-section
      >
        <CorporateIndustriesMotion />
        <div className={styles.industriesAtmosphere} aria-hidden="true" />
        <div className={styles.industriesInner}>
          <header className={styles.industriesEditorial}>
            <p className={styles.industriesEyebrow}>WHERE INTELLIGENCE MEETS THE REAL WORLD</p>
            <h2 id="corporate-industries-heading">Built for environments where complexity has consequence.</h2>
            <p className={styles.industriesCopy}>Nexus Pavilion Inc. builds for complex real-world environments where data, infrastructure, operations, and human judgment converge. We focus on domains in which context matters, trade-offs are material, and better decisions depend on understanding the system as a whole—not merely its individual signals.</p>
          </header>

          <div className={styles.industryTerritories}>
            <article className={styles.industryTerritory}>
              <p>01 / BUILT ENVIRONMENT</p>
              <h3>BUILT ENVIRONMENT</h3>
              <span>Where physical assets, capital, coordination, and execution come together across complex project lifecycles.</span>
            </article>
            <article className={styles.industryTerritory}>
              <p>02 / INDUSTRIAL SYSTEMS</p>
              <h3>INDUSTRIAL SYSTEMS</h3>
              <span>Where reliability, dependencies, constraints, and operating conditions shape what decisions can achieve.</span>
            </article>
            <article className={styles.industryTerritory}>
              <p>03 / INFRASTRUCTURE</p>
              <h3>INFRASTRUCTURE</h3>
              <span>Where continuity, resilience, and long-term performance depend on clear understanding across interconnected systems.</span>
            </article>
            <article className={styles.industryTerritory}>
              <p>04 / PROFESSIONAL SYSTEMS</p>
              <h3>PROFESSIONAL SYSTEMS</h3>
              <span>Where expertise, evidence, and judgment must remain visible, accountable, and usable throughout the decision process.</span>
            </article>
          </div>

          <p className={styles.industriesStatement}>The value of intelligence is determined by how well it understands the world it is meant to serve.</p>
        </div>
      </section>
    </main>
  );
}
