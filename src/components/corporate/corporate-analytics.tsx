"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import styles from "@/components/corporate/corporate-analytics.module.css";

const CONSENT_STORAGE_KEY = "nexus-pavilion:corporate-analytics-consent";

type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function resolveGaMeasurementId(raw?: string | null): string | undefined {
  const candidate = raw?.trim() || "";
  return /^G-[A-Z0-9]+$/i.test(candidate) ? candidate : undefined;
}

function readStoredConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === "granted" || value === "denied") {
      return value;
    }
  } catch {
    // Ignore storage failures; treat as undecided.
  }
  return null;
}

function writeStoredConsent(value: AnalyticsConsent) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures; in-memory state still drives this session.
  }
}

function buildPagePath(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") {
    return;
  }
  // Mirror the official gtag bootstrap (pushes the Arguments object).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments as unknown as never);
  };
}

let consentDefaultApplied = false;

function ensureConsentDefaultDenied() {
  ensureGtag();
  if (consentDefaultApplied) {
    return;
  }
  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  consentDefaultApplied = true;
}

function setGaRuntimeDisabled(measurementId: string, disabled: boolean) {
  Object.assign(window, { [`ga-disable-${measurementId}`]: disabled });
}

function revokeRuntimeAnalytics(measurementId: string) {
  ensureConsentDefaultDenied();
  setGaRuntimeDisabled(measurementId, true);
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function grantRuntimeAnalytics(measurementId: string) {
  ensureConsentDefaultDenied();
  setGaRuntimeDisabled(measurementId, false);
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
  });
}

function configureCorporateGa(measurementId: string) {
  ensureGtag();
  window.gtag?.("js", new Date());
  window.gtag?.("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

function isGtagScriptPresent(measurementId: string) {
  return Boolean(
    document.querySelector(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`,
    ),
  );
}

function sendCorporatePageView(measurementId: string, pagePath: string) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    send_to: measurementId,
  });
}

/**
 * Corporate-public GA4 only.
 * Mounted exclusively from the AppShell "public" branch.
 * Scripts and page_view events run only after explicit analytics consent.
 * On unmount (leaving public shell), runtime analytics is revoked so SPA
 * history / Enhanced Measurement cannot keep transmitting outside Corporate.
 */
export default function CorporateAnalytics() {
  const measurementId = resolveGaMeasurementId(
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-mount localStorage consent sync
    setConsent(readStoredConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    ensureConsentDefaultDenied();

    if (consent !== "granted") {
      revokeRuntimeAnalytics(measurementId);
      return;
    }

    grantRuntimeAnalytics(measurementId);

    // Script may already be present after a prior Corporate visit in this SPA session.
    // Next.js <Script> may not re-fire onLoad, so resume readiness explicitly.
    if (isGtagScriptPresent(measurementId)) {
      configureCorporateGa(measurementId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resume after SPA re-entry when gtag already loaded
      setScriptReady(true);
    }

    return () => {
      // Boundary exit: stop all analytics transmission; keep stored preference.
      revokeRuntimeAnalytics(measurementId);
      lastTrackedPath.current = null;
    };
  }, [consent, measurementId]);

  useEffect(() => {
    if (!measurementId || consent !== "granted" || !scriptReady) {
      return;
    }

    const pagePath = buildPagePath(pathname, searchParams);
    if (lastTrackedPath.current === pagePath) {
      return;
    }

    lastTrackedPath.current = pagePath;
    sendCorporatePageView(measurementId, pagePath);
  }, [consent, measurementId, pathname, scriptReady, searchParams]);

  if (!measurementId || !hydrated) {
    return null;
  }

  function acceptAnalytics() {
    writeStoredConsent("granted");
    setConsent("granted");
  }

  function declineAnalytics() {
    writeStoredConsent("denied");
    setConsent("denied");
    lastTrackedPath.current = null;
    setScriptReady(false);
    if (measurementId) {
      revokeRuntimeAnalytics(measurementId);
    }
  }

  return (
    <>
      {consent === "granted" ? (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
          strategy="afterInteractive"
          onLoad={() => {
            grantRuntimeAnalytics(measurementId);
            configureCorporateGa(measurementId);
            setScriptReady(true);
          }}
        />
      ) : null}

      {consent === null ? (
        <div
          className={styles.banner}
          role="dialog"
          aria-labelledby="corporate-analytics-consent-title"
          aria-describedby="corporate-analytics-consent-description"
        >
          <div className={styles.copy}>
            <p id="corporate-analytics-consent-title" className={styles.title}>
              Optional analytics
            </p>
            <p
              id="corporate-analytics-consent-description"
              className={styles.body}
            >
              Nexus Pavilion Inc. uses Google Analytics 4 on this corporate website
              only, to understand aggregate traffic and usage. Analytics is optional
              and non-essential.{" "}
              <Link
                href="/privacy#cookies-storage-tracking"
                className={styles.privacyLink}
              >
                Privacy
              </Link>
            </p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.decline}
              onClick={declineAnalytics}
            >
              Decline
            </button>
            <button
              type="button"
              className={styles.accept}
              onClick={acceptAnalytics}
            >
              Accept analytics
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
