"use client";

import { useEffect, useRef } from "react";

export default function CorporateProductsMotion() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = markerRef.current?.closest<HTMLElement>(
      "[data-products-section]",
    );

    if (!section) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotion.matches) {
      section.dataset.motion = "active";
      return;
    }

    section.dataset.motion = "waiting";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        section.dataset.motion = "active";
        observer.disconnect();
      },
      { rootMargin: "-10% 0px -14%", threshold: 0.08 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
