import type { Metadata } from "next";
import { Instrument_Sans, Manrope } from "next/font/google";
import Link from "next/link";

import ContactForm from "@/components/contact-form";
import styles from "@/components/corporate/corporate-contact.module.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-corporate-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-corporate-body", display: "swap" });

const CONTACT_TITLE = "Contact | NexusPavilion Inc.";
const CONTACT_DESCRIPTION = "Contact NexusPavilion Inc. for corporate and product inquiries.";

export const metadata: Metadata = {
  title: { absolute: CONTACT_TITLE },
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
  openGraph: { title: CONTACT_TITLE, description: CONTACT_DESCRIPTION, url: "/contact", siteName: "NexusPavilion Inc.", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: CONTACT_TITLE, description: CONTACT_DESCRIPTION },
};

export default function ContactPage() {
  return (
    <main className={`${styles.page} ${instrumentSans.variable} ${manrope.variable}`}>
      <div className={styles.architecture} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.homeLink}><span aria-hidden="true">←</span>NexusPavilion Inc.</Link>
          <span className={styles.chapter}>CORPORATE CONTACT / 01</span>
        </header>

        <section className={styles.reception} aria-labelledby="contact-heading">
          <div className={styles.editorial}>
            <p className={styles.eyebrow}>START A CONVERSATION</p>
            <h1 id="contact-heading">Start with what matters.</h1>
            <p className={styles.supporting}>Nexus Pavilion Inc. welcomes corporate, product, partnership, and business inquiries. Share the context, the objective, and the problem you are working through. We will route your message to the appropriate part of the company and respond with the next useful step.</p>
            <address className={styles.directContact}>
              <p>CORPORATE CONTACT</p>
              <a href="mailto:contact@thenexuspavilion.com">contact@thenexuspavilion.com</a>
              <span>Toronto, Ontario, Canada</span>
            </address>
          </div>

          <section className={styles.formPlane} aria-labelledby="inquiry-heading">
            <div className={styles.formIntroduction}>
              <p>YOUR INQUIRY</p>
              <h2 id="inquiry-heading">Tell us what you’re working through.</h2>
              <span>A concise brief is enough to begin. Include the context, what you are trying to accomplish, and where clarity would be most useful.</span>
            </div>
            <ContactForm />
          </section>
        </section>

        <div className={styles.horizon} aria-hidden="true"><span /><i /></div>
        <p className={styles.closing}>Clear conversations are where useful systems begin.</p>
      </div>
    </main>
  );
}
