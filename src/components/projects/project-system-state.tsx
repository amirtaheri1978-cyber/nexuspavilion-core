import Link from "next/link";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";

export function ProjectSystemState({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className={EXECUTIVE_PAGE_CLASS}>
      <section className="rounded-[34px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-[#C8A646]">
          {eyebrow}
        </p>

        <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
          {title}
        </h1>

        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
          {description}
        </p>

        {primaryHref || secondaryHref ? (
          <div className="mt-7 flex flex-wrap gap-3">
            {primaryHref && primaryLabel ? (
              <Link href={primaryHref} className={EXECUTIVE_CTA_PRIMARY}>
                {primaryLabel}
              </Link>
            ) : null}

            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className={EXECUTIVE_CTA_SECONDARY}>
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
