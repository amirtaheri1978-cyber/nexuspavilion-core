import Link from "next/link";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import styles from "@/components/corporate/corporate-footer.module.css";
import { corporateSocialProfiles } from "@/components/corporate/corporate-social-profiles";

const corporateNavigation = [
  { label: "Company", href: "/about" },
  { label: "Technology", href: "/#corporate-technology" },
  { label: "Industries", href: "/#industries" },
  { label: "Products", href: "/#products-projects" },
  { label: "Contact", href: "/contact" },
] as const;

const legalNavigation = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export default function Footer() {
  return (
    <footer className={styles.footer} aria-labelledby="corporate-footer-title">
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.frame}>
        <div className={styles.topRule} aria-hidden="true">
          <span />
          <span />
        </div>

        <div className={styles.primaryGrid}>
          <section className={styles.identity} aria-labelledby="corporate-footer-title">
            <NexusPavilionLogo className={styles.logo} variant="icon" size={78} />
            <p className={styles.ordinal}>NEXUS PAVILION / CORPORATE</p>
            <h2 id="corporate-footer-title">Nexus Pavilion Inc.</h2>
            <p className={styles.mission}>
              Focused AI and software systems for complex real-world environments.
            </p>
            <address className={styles.address}>
              <span>Ontario, Canada</span>
              <a href="mailto:contact@nexuspavilion.com">
                contact@nexuspavilion.com
              </a>
            </address>
            <nav className={styles.social} aria-label="Nexus Pavilion Inc. on social media">
              <p className={styles.socialEyebrow}>Connect</p>
              <ul className={styles.socialList}>
                {corporateSocialProfiles.map((profile) => (
                  <li key={profile.href}>
                    <a
                      href={profile.href}
                      className={styles.socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={profile.accessibleName}
                    >
                      {profile.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          <div className={styles.navigationArchitecture}>
            <nav className={styles.primaryNavigation} aria-label="Corporate">
              <p>Corporate</p>
              <ol>
                {corporateNavigation.map((item, index) => (
                  <li key={item.label}>
                    <span aria-hidden="true">0{index + 1}</span>
                    <FooterLink href={item.href}>{item.label}</FooterLink>
                  </li>
                ))}
              </ol>
            </nav>

            <nav className={styles.secondaryNavigation} aria-label="Legal">
              <p>Legal</p>
              <div>
                {legalNavigation.map((item) => (
                  <FooterLink key={item.label} href={item.href}>
                    {item.label}
                  </FooterLink>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <aside className={styles.product} aria-labelledby="footer-product-title">
          <p className={styles.productEyebrow}>Product / 01</p>
          <h2 id="footer-product-title">Intelligent Procurement</h2>
          <p>A Nexus Pavilion Inc. product · In Development</p>
        </aside>

        <div className={styles.closing}>
          <p>Built with a long view of technology, context, and consequence.</p>
          <span aria-hidden="true">ONTARIO, CANADA</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}
