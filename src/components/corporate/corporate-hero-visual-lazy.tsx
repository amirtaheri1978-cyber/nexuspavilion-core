"use client";

import dynamic from "next/dynamic";

import styles from "./corporate-home.module.css";

const CorporateHeroVisual = dynamic(() => import("./corporate-hero-visual"), {
  ssr: false,
  loading: () => (
    <div className={styles.visual} aria-hidden="true">
      <div className={styles.fallback} />
      <div className={styles.loading}>Composing Nexus spatial intelligence</div>
    </div>
  ),
});

export default function CorporateHeroVisualLazy() {
  return <CorporateHeroVisual />;
}
