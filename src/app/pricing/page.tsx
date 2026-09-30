import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "Intelligent Procurement Early Access | Nexus Pavilion";
const PAGE_DESCRIPTION =
  "Explore the limited early access and founding customer program for Intelligent Procurement by Nexus Pavilion.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: "Nexus Pavilion",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const valueAreas = [
  ["01", "Focused Deployment", "Start with procurement workflows where the platform can create clear operational value."],
  ["02", "Guided Onboarding", "Establish the organization, access model, and initial procurement environment with direct support."],
  ["03", "Flexible Commercial Structure", "Early-access terms are structured around organizational requirements, deployment scope, and intended use."],
  ["04", "Real-World Feedback", "Early customers provide practical operating insight that helps refine the product around actual procurement conditions."],
] as const;

const capabilities = [
  "Structured RFQ workflows",
  "Supplier invitations and submissions",
  "Procurement governance",
  "Commercial evaluation",
  "Contract award workflows",
  "Supplier intelligence",
  "Executive decision support",
] as const;

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020b16] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(48,190,221,0.12),transparent_26%),radial-gradient(circle_at_16%_46%,rgba(183,146,57,0.08),transparent_28%),linear-gradient(180deg,#061426_0%,#030c18_58%,#020711_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <section className="relative border-y border-white/10 py-16 sm:py-20 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:gap-16 lg:py-28">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.38em] text-[#e0bd63]">
              Limited Early Access
            </p>
            <h1 className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-[5.35rem]">
              Early access, structured around real procurement.
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
              Intelligent Procurement is opening to a limited number of
              organizations for real-world deployment.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center border border-[#d9b85d]/60 bg-[#d9b85d] px-7 text-sm font-bold text-[#06101d] transition-colors hover:bg-[#efd17a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efd17a]">
                Explore Early Access
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center border border-white/15 px-7 text-sm font-semibold text-white transition-colors hover:border-cyan-200/45 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
                Existing customer? Sign in
              </Link>
            </div>
          </div>

          <div className="mt-12 border-l border-cyan-200/20 pl-6 lg:mt-16 lg:self-end lg:pl-9">
            <p className="text-sm leading-7 text-slate-300">
              Each engagement is structured around the organization&apos;s
              sourcing workflows, supplier relationships, governance
              requirements, and deployment priorities.
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-300">
              Rather than a predefined public plan, early engagements establish
              the appropriate scope, onboarding approach, and commercial
              structure.
            </p>
          </div>
        </section>

        <section className="py-20 sm:py-24 lg:py-32" aria-labelledby="program-heading">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-20">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.32em] text-cyan-200/80">
                Founding Customer Program
              </p>
              <h2 id="program-heading" className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
                A focused path to real-world adoption.
              </h2>
            </div>

            <div className="border-t border-white/10">
              {valueAreas.map(([index, title, description]) => (
                <article key={title} className="grid gap-4 border-b border-white/10 py-8 sm:grid-cols-[3.5rem_0.8fr_1.2fr] sm:items-start sm:gap-7">
                  <span className="text-xs font-semibold tracking-[0.22em] text-[#e0bd63]">{index}</span>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
                  <p className="max-w-xl text-sm leading-7 text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 py-16 sm:py-20 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-24">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.32em] text-[#e0bd63]">Current Product Scope</p>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-4xl">
              Capabilities grounded in consequential procurement work.
            </h2>
          </div>

          <ul className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:mt-0">
            {capabilities.map((capability) => (
              <li key={capability} className="flex min-h-16 items-center border-b border-white/10 py-4 text-sm font-medium text-slate-200">
                <span className="mr-4 h-px w-5 shrink-0 bg-cyan-300/60" />
                {capability}
              </li>
            ))}
          </ul>
        </section>

        <section className="py-20 sm:py-24 lg:flex lg:items-end lg:justify-between lg:gap-16 lg:py-32">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.32em] text-cyan-200/80">Begin the Conversation</p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">
              Define the right starting point for your organization.
            </h2>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row lg:mt-0 lg:shrink-0">
            <Link href="/contact" className="inline-flex min-h-12 items-center justify-center border border-[#d9b85d]/60 bg-[#d9b85d] px-7 text-sm font-bold text-[#06101d] transition-colors hover:bg-[#efd17a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efd17a]">
              Explore Early Access
            </Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center border border-white/15 px-7 text-sm font-semibold text-white transition-colors hover:border-cyan-200/45 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
              Existing customer? Sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}