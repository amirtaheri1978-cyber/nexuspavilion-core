"use client";

import { useEffect, useRef } from "react";

export default function CorporateTechnologyMotion() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = markerRef.current?.closest<HTMLElement>(
      "[data-technology-section]",
    );

    if (!section) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const precisePointer = window.matchMedia(
      "(pointer: fine) and (min-width: 981px)",
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
      { rootMargin: "-12% 0px -18%", threshold: 0.12 },
    );

    observer.observe(section);

    const onPointerMove = (event: PointerEvent) => {
      if (!precisePointer.matches) return;
      const bounds = section.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      section.style.setProperty("--technology-shift-x", `${x * 4}px`);
      section.style.setProperty("--technology-shift-y", `${y * 4}px`);
    };

    const onPointerLeave = () => {
      section.style.setProperty("--technology-shift-x", "0px");
      section.style.setProperty("--technology-shift-y", "0px");
    };

    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerleave", onPointerLeave);

    return () => {
      observer.disconnect();
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
