import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import CorporateHeroVisual from "@/components/corporate/corporate-hero-visual";
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
              <div id="industries" className={styles.topics}><span>Industries</span><span>People</span><span>Planet</span><span>Progress</span></div>
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
    </main>
  );
}
