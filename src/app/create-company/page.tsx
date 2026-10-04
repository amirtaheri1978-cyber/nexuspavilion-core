"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import SignOutButton from "@/components/sign-out-button";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";
import { getFriendlyWorkspaceCreateError } from "@/lib/auth/workspace-bootstrap";
import {
  getPostCompanyCreatePath,
  isRfqSubmitContinuationPath,
} from "@/lib/auth/login-continuation";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  loadCurrentUserProfessionalNames,
  normalizeJobTitle,
  normalizeProfessionalName,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";
import { createClient } from "@/lib/supabase/client";

type OrganizationType =
  | "owner_developer"
  | "general_contractor"
  | "consultant"
  | "service_provider"
  | "supplier";

type AccountType =
  | "buyer_owner"
  | "vendor_supplier"
  | "consultant"
  | "service_provider";

type WizardStep = "identity" | "organization" | "review";

type CreateCompanyResponse = {
  success?: boolean;
  redirectTo?: string;
  error?: string;
};

type OrganizationOption = {
  value: OrganizationType;
  label: string;
  shortLabel: string;
  accountType: AccountType;
  networkRole: string;
  description: string;
  examples: string[];
  workspaceTitle: string;
  workspaceDescription: string;
  workspaceCapabilities: string[];
};

const ORGANIZATION_TYPES: OrganizationOption[] = [
  {
    value: "owner_developer",
    label: "Owner / Developer",
    shortLabel: "Owner",
    accountType: "buyer_owner",
    networkRole: "Project Owner",
    description:
      "Organizations responsible for planning, funding, developing, owning, and governing capital construction projects.",
    examples: [
      "Commercial Real Estate Developers",
      "Institutional Owners",
      "Public Sector Agencies",
      "Infrastructure Developers",
    ],
    workspaceTitle: "Owner Procurement Workspace",
    workspaceDescription:
      "Built for owners and developers managing RFQs, consultant engagement, contractor procurement, supplier participation, awards, and executive reporting.",
    workspaceCapabilities: [
      "Create RFQs",
      "Invite suppliers",
      "Compare proposals",
      "Record procurement awards",
      "Generate executive reports",
    ],
  },
  {
    value: "general_contractor",
    label: "General Contractor",
    shortLabel: "GC",
    accountType: "buyer_owner",
    networkRole: "General Contractor",
    description:
      "Organizations responsible for delivering construction projects through contracting, construction management, design-build, and EPC delivery models.",
    examples: [
      "General Contracting Firms",
      "Construction Management Firms",
      "Design-Build Firms",
      "Infrastructure Contractors",
    ],
    workspaceTitle: "Contractor Procurement Workspace",
    workspaceDescription:
      "Built for contractors managing trade packages, supplier outreach, quote comparison, subcontractor awards, procurement visibility, and project execution intelligence.",
    workspaceCapabilities: [
      "Create RFQs",
      "Invite subcontractors",
      "Compare trade quotes",
      "Record package awards",
      "Track procurement execution",
    ],
  },
  {
    value: "consultant",
    label: "Consultant",
    shortLabel: "Consultant",
    accountType: "consultant",
    networkRole: "Professional Consultant",
    description:
      "Professional consulting organizations providing architecture, engineering, project management, cost management, and technical advisory services.",
    examples: [
      "Architecture Firms",
      "Engineering Firms",
      "Cost Consultants",
      "Project Management Firms",
    ],
    workspaceTitle: "Consultant Workspace",
    workspaceDescription:
      "Built for professional consulting teams supporting project requirements, procurement strategy, technical evaluation, advisory workflows, and collaboration.",
    workspaceCapabilities: [
      "Support project teams",
      "Join procurement workflows",
      "Manage advisory visibility",
      "Collaborate on requirements",
      "Contribute technical expertise",
    ],
  },
  {
    value: "service_provider",
    label: "Service Provider",
    shortLabel: "Service",
    accountType: "service_provider",
    networkRole: "Construction Service Provider",
    description:
      "Organizations delivering specialized construction services, trade installation, commissioning, testing, inspection, logistics, and facility support.",
    examples: [
      "Specialty Trade Contractors",
      "Mechanical Contractors",
      "Electrical Contractors",
      "Testing & Inspection Firms",
    ],
    workspaceTitle: "Construction Services Workspace",
    workspaceDescription:
      "Built for service providers receiving service RFQs, submitting technical and commercial proposals, managing project opportunities, and tracking awarded work.",
    workspaceCapabilities: [
      "Receive service RFQs",
      "Submit technical proposals",
      "Manage project opportunities",
      "Track recorded awards",
      "Showcase service expertise",
    ],
  },
  {
    value: "supplier",
    label: "Building Products Supplier",
    shortLabel: "Supplier",
    accountType: "vendor_supplier",
    networkRole: "Building Products Supplier",
    description:
      "Organizations supplying construction materials, architectural products, building systems, construction equipment, and distribution services.",
    examples: [
      "Building Materials Suppliers",
      "Architectural Products Suppliers",
      "Building Systems Suppliers",
      "Construction Product Distributors",
    ],
    workspaceTitle: "Supplier Network Workspace",
    workspaceDescription:
      "Built for suppliers that receive RFQs, submit quotes, manage company visibility, track project opportunities, and build procurement reputation.",
    workspaceCapabilities: [
      "Receive RFQs",
      "Submit quotes",
      "Manage company profile",
      "Track opportunities",
      "Build procurement reputation",
    ],
  },
];

const STEPS: {
  key: WizardStep;
  label: string;
  description: string;
}[] = [
  {
    key: "identity",
    label: "Company Identity",
    description: "Name and regional hub",
  },
  {
    key: "organization",
    label: "Organization Type",
    description: "Workspace configuration",
  },
  {
    key: "review",
    label: "Review & Activate",
    description: "Launch workspace",
  },
];

const inputClassName =
  "h-[58px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15 focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-60";

function normalizeValue(value: string) {
  return value.trim();
}

function getFriendlyCreateCompanyError(message?: string) {
  return getFriendlyWorkspaceCreateError(message);
}

export default function CreateCompanyPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />
          <div className={`${EXECUTIVE_PAGE_CLASS} flex min-h-screen items-center justify-center`}>
            <p className="text-sm font-semibold text-slate-300">
              Preparing company setup…
            </p>
          </div>
        </main>
      }
    >
      <CreateCompanyWizard />
    </Suspense>
  );
}

function CreateCompanyWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const continuationNext = searchParams.get("next");
  const isRfqQuoteContinuation =
    isRfqSubmitContinuationPath(continuationNext);

  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const jobTitleErrorId = useId();

  const [currentStep, setCurrentStep] =
    useState<WizardStep>("identity");

  const [organizationType, setOrganizationType] =
    useState<OrganizationType>(() =>
      isRfqQuoteContinuation ? "supplier" : "owner_developer",
    );

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [attemptedReviewSubmit, setAttemptedReviewSubmit] =
    useState(false);

  const namesHydratedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedOrganization =
    ORGANIZATION_TYPES.find(
      (item) => item.value === organizationType,
    ) || ORGANIZATION_TYPES[0];

  const identityIsReady = useMemo(() => {
    return (
      normalizeValue(name).length >= 2 &&
      normalizeValue(location).length >= 2
    );
  }, [name, location]);

  const normalizedFirstName = normalizeProfessionalName(firstName);
  const normalizedLastName = normalizeProfessionalName(lastName);
  const normalizedJobTitle = normalizeJobTitle(jobTitle);

  const firstNameError = validateProfessionalName(
    normalizedFirstName,
    "First name",
    { required: attemptedReviewSubmit },
  );
  const lastNameError = validateProfessionalName(
    normalizedLastName,
    "Last name",
    { required: attemptedReviewSubmit },
  );
  const jobTitleError = validateFounderJobTitle(normalizedJobTitle, {
    required: attemptedReviewSubmit,
  });

  const founderIdentityIsReady =
    !validateProfessionalName(normalizedFirstName, "First name", {
      required: true,
    }) &&
    !validateProfessionalName(normalizedLastName, "Last name", {
      required: true,
    }) &&
    !validateFounderJobTitle(normalizedJobTitle, { required: true });

  const formIsReady =
    identityIsReady &&
    Boolean(selectedOrganization) &&
    founderIdentityIsReady;

  useEffect(() => {
    let cancelled = false;

    async function preloadFounderNames() {
      const resolved = await loadCurrentUserProfessionalNames(
        supabase,
      );

      if (cancelled || namesHydratedRef.current) {
        return;
      }

      namesHydratedRef.current = true;

      if (resolved.firstName) {
        setFirstName((current) =>
          current.trim() ? current : resolved.firstName || "",
        );
      }

      if (resolved.lastName) {
        setLastName((current) =>
          current.trim() ? current : resolved.lastName || "",
        );
      }
    }

    void preloadFounderNames();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function goToStep(step: WizardStep) {
    if (loading) return;

    if (step !== "identity" && !identityIsReady) {
      setError(
        "Please complete your company name and regional hub first.",
      );
      setCurrentStep("identity");
      return;
    }

    setError("");
    setCurrentStep(step);
  }

  function goNext() {
    if (currentStep === "identity") {
      if (!identityIsReady) {
        setError(
          "Please enter your company name and regional hub to continue.",
        );
        return;
      }

      setError("");
      setCurrentStep("organization");
      return;
    }

    if (currentStep === "organization") {
      setError("");
      setCurrentStep("review");
    }
  }

  function goBack() {
    if (loading) return;

    setError("");

    if (currentStep === "review") {
      setCurrentStep("organization");
      return;
    }

    if (currentStep === "organization") {
      setCurrentStep("identity");
    }
  }

  async function handleCreateCompany(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (currentStep !== "review") {
      goNext();
      return;
    }

    const normalizedName = normalizeValue(name);
    const normalizedLocation = normalizeValue(location);
    const submittedFirstName = normalizeProfessionalName(firstName);
    const submittedLastName = normalizeProfessionalName(lastName);
    const submittedJobTitle = normalizeJobTitle(jobTitle);

    setAttemptedReviewSubmit(true);

    if (!formIsReady || !selectedOrganization) {
      setError(
        "Please select your organization type and complete the required fields.",
      );
      return;
    }

    const submittedFirstNameError = validateProfessionalName(
      submittedFirstName,
      "First name",
      { required: true },
    );
    const submittedLastNameError = validateProfessionalName(
      submittedLastName,
      "Last name",
      { required: true },
    );
    const submittedJobTitleError = validateFounderJobTitle(
      submittedJobTitle,
      { required: true },
    );

    if (
      submittedFirstNameError ||
      submittedLastNameError ||
      submittedJobTitleError
    ) {
      setCurrentStep("review");
      setError(
        submittedFirstNameError ||
          submittedLastNameError ||
          submittedJobTitleError ||
          "Please complete your professional identity details.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/companies/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          location: normalizedLocation,
          accountType: selectedOrganization.accountType,
          networkRole: selectedOrganization.networkRole,
          firstName: submittedFirstName,
          lastName: submittedLastName,
          jobTitle: submittedJobTitle,
          next: continuationNext,
        }),
      });

      let data: CreateCompanyResponse = {};

      try {
        data =
          (await response.json()) as CreateCompanyResponse;
      } catch {
        data = {};
      }

      if (!response.ok) {
        setError(
          getFriendlyCreateCompanyError(data.error),
        );
        setLoading(false);
        return;
      }

      router.push(
        getPostCompanyCreatePath(
          continuationNext,
          data.redirectTo || "/company/settings",
        ),
      );
      router.refresh();
    } catch {
      setError(
        "A secure workspace creation request could not be completed. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061426] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(200,166,70,0.15),transparent_30%),linear-gradient(180deg,#061426_0%,#07111F_45%,#020617_100%)]" />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_34%,rgba(200,166,70,0.05)_68%,transparent)]" />

      <div className={EXECUTIVE_PAGE_CLASS}>
        <header className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <BrandMark />

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="max-w-md sm:text-right">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F2D778]">
                Company workspace setup
              </p>

              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-400">
                Complete this guided setup to activate your company
                workspace, or securely sign out of this session.
              </p>
            </div>

            <SignOutButton mode="logout-only" />
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
          <aside className="flex flex-col rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9 lg:p-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
              Intelligent Procurement
            </p>

            <h1 className="mt-5 max-w-xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl xl:text-[56px] xl:leading-[1.02]">
              Establish your company workspace.
            </h1>

            <p className="mt-6 max-w-xl text-base font-semibold leading-8 text-slate-300">
              Confirm company identity, organization type, and founder
              details to open your procurement environment with the
              correct operating model.
            </p>

            <div className="mt-8 border-t border-white/10 pt-7">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                {selectedOrganization.workspaceTitle}
              </p>

              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                {selectedOrganization.label}
              </h2>

              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                {selectedOrganization.workspaceDescription}
              </p>

              <ul className="mt-6 space-y-2.5">
                {selectedOrganization.workspaceCapabilities.map(
                  (capability) => (
                    <li
                      key={capability}
                      className="flex items-start gap-3 text-sm font-semibold text-slate-200"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C8A646]/35 bg-[#C8A646]/10 text-[10px] text-[#F5D77B]"
                      >
                        ✓
                      </span>
                      <span>{capability}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <p className="mt-auto pt-8 text-xs font-semibold leading-5 text-slate-500">
              A Nexus Pavilion Inc. product · Company branding, coverage,
              and certifications can be completed after activation.
            </p>
          </aside>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.055] p-6 text-white sm:p-8 lg:p-10">
            <div className="border-b border-white/10 pb-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#F2D778]">
                Guided company onboarding
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
                Complete the three setup steps.
              </h2>

              <nav
                aria-label="Company setup steps"
                className="mt-6 grid gap-2 sm:grid-cols-3"
              >
                {STEPS.map((step, index) => {
                  const active = step.key === currentStep;

                  const completed =
                    (step.key === "identity" && identityIsReady) ||
                    (step.key === "organization" &&
                      currentStep === "review" &&
                      identityIsReady);

                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => goToStep(step.key)}
                      disabled={loading}
                      aria-current={active ? "step" : undefined}
                      className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_GOLD} ${
                        active
                          ? "border-[#C8A646]/45 bg-[#C8A646]/10"
                          : "border-white/10 bg-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                          active ? "text-[#F5D77B]" : "text-slate-500"
                        }`}
                      >
                        {completed ? "Ready" : `Step ${index + 1}`}
                      </p>

                      <p className="mt-1 text-xs font-black text-white">
                        {step.label}
                      </p>

                      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                        {step.description}
                      </p>
                    </button>
                  );
                })}
              </nav>
            </div>

            {isRfqQuoteContinuation ? (
              <p
                className="mt-6 rounded-2xl border border-[#C8A646]/35 bg-[#C8A646]/10 px-4 py-3 text-sm font-semibold leading-6 text-slate-200"
                role="status"
              >
                You are continuing to submit an RFQ quote. Supplier has therefore been preselected. You may choose another organization type if that better describes your company.
              </p>
            ) : null}

            <form
              onSubmit={handleCreateCompany}
              className="mt-8"
            >
              {currentStep === "identity" ? (
                <section className="space-y-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                      Company Identity
                    </p>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                      Enter the minimum company details required to
                      activate your workspace. Branding, services,
                      products, certifications, and network visibility
                      can be completed afterward in Company Settings.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Company name
                    </span>

                    <input
                      type="text"
                      required
                      placeholder={
                        organizationType === "supplier"
                          ? "Northline Building Products Ltd."
                          : "Northline Development Group"
                      }
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      disabled={loading}
                      className={inputClassName}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      This name will be visible to procurement
                      teams, suppliers, and project partners within
                      Intelligent Procurement.
                    </p>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Regional hub
                    </span>

                    <input
                      type="text"
                      required
                      placeholder="Toronto, ON"
                      value={location}
                      onChange={(event) =>
                        setLocation(event.target.value)
                      }
                      disabled={loading}
                      className={inputClassName}
                    />

                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      Used for supplier discovery, market context,
                      procurement reporting, and regional
                      intelligence.
                    </p>
                  </label>
                </section>
              ) : null}

              {currentStep === "organization" ? (
                <section className="space-y-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                      Organization Type
                    </p>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                      Select the organization type that best describes
                      your company. Intelligent Procurement uses this to
                      configure the correct workspace operating model.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {ORGANIZATION_TYPES.map((item) => {
                      const selected =
                        item.value === organizationType;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            setOrganizationType(
                              item.value,
                            )
                          }
                          className={`min-h-11 rounded-3xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_GOLD} ${
                            selected
                              ? "border-[#C8A646]/45 bg-slate-950 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
                              : "border-white/10 bg-white/[0.045] text-white hover:border-[#C8A646]/40 hover:bg-white/[0.07]"
                          }`}
                          aria-pressed={selected}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-lg font-black">
                                {item.label}
                              </p>

                              <p
                                className={`mt-2 text-sm font-semibold leading-6 ${
                                  selected
                                    ? "text-slate-300"
                                    : "text-slate-400"
                                }`}
                              >
                                {item.description}
                              </p>
                            </div>

                            <span
                              className={`mt-1 rounded-full px-3 py-1 text-xs font-black ${
                                selected
                                  ? "bg-[#C8A646] text-slate-950"
                                  : "bg-white/10 text-slate-300"
                              }`}
                            >
                              {selected
                                ? "Selected"
                                : item.shortLabel}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.examples.map(
                              (example) => (
                                <span
                                  key={example}
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    selected
                                      ? "bg-white/10 text-slate-200"
                                      : "bg-white/[0.06] text-slate-400"
                                  }`}
                                >
                                  {example}
                                </span>
                              ),
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {currentStep === "review" ? (
                <section className="space-y-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                      Review & Activate
                    </p>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                      Review your company workspace configuration
                      before activation.
                    </p>
                  </div>

                  <div className="border-y border-white/10 py-6">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                      Workspace Summary
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <ReviewItem
                        label="Company"
                        value={name || "Not set"}
                      />

                      <ReviewItem
                        label="Regional Hub"
                        value={location || "Not set"}
                      />

                      <ReviewItem
                        label="Organization Type"
                        value={
                          selectedOrganization.label
                        }
                      />

                      <ReviewItem
                        label="Network Role"
                        value={
                          selectedOrganization.networkRole
                        }
                      />
                    </div>
                  </div>

                  <section>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#F2D778]">
                      Founder Professional Identity
                    </p>

                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                      Confirm your name and title for this workspace.
                      Names collected at signup are prefilled and can
                      be corrected before activation.
                    </p>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={firstNameId}
                          className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
                        >
                          First name
                        </label>

                        <input
                          id={firstNameId}
                          type="text"
                          name="firstName"
                          autoComplete="given-name"
                          required
                          maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
                          placeholder="Alex"
                          value={firstName}
                          onChange={(event) =>
                            setFirstName(event.target.value)
                          }
                          disabled={loading}
                          aria-invalid={Boolean(firstNameError)}
                          aria-describedby={
                            firstNameError
                              ? firstNameErrorId
                              : undefined
                          }
                          className={inputClassName}
                        />

                        {firstNameError ? (
                          <p
                            id={firstNameErrorId}
                            role="alert"
                            className="mt-2 text-xs font-bold leading-5 text-red-200"
                          >
                            {firstNameError}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor={lastNameId}
                          className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
                        >
                          Last name
                        </label>

                        <input
                          id={lastNameId}
                          type="text"
                          name="lastName"
                          autoComplete="family-name"
                          required
                          maxLength={PROFESSIONAL_NAME_MAX_LENGTH}
                          placeholder="Morgan"
                          value={lastName}
                          onChange={(event) =>
                            setLastName(event.target.value)
                          }
                          disabled={loading}
                          aria-invalid={Boolean(lastNameError)}
                          aria-describedby={
                            lastNameError
                              ? lastNameErrorId
                              : undefined
                          }
                          className={inputClassName}
                        />

                        {lastNameError ? (
                          <p
                            id={lastNameErrorId}
                            role="alert"
                            className="mt-2 text-xs font-bold leading-5 text-red-200"
                          >
                            {lastNameError}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5">
                      <label
                        htmlFor={jobTitleId}
                        className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
                      >
                        Job title
                      </label>

                      <input
                        id={jobTitleId}
                        type="text"
                        name="jobTitle"
                        autoComplete="organization-title"
                        required
                        maxLength={JOB_TITLE_MAX_LENGTH}
                        placeholder="Chief Procurement Officer"
                        value={jobTitle}
                        onChange={(event) =>
                          setJobTitle(event.target.value)
                        }
                        disabled={loading}
                        aria-invalid={Boolean(jobTitleError)}
                        aria-describedby={
                          jobTitleError
                            ? `${jobTitleErrorId} job-title-hint`
                            : "job-title-hint"
                        }
                        className={inputClassName}
                      />

                      <p
                        id="job-title-hint"
                        className="mt-2 text-xs font-semibold leading-5 text-slate-500"
                      >
                        Your title in this workspace
                      </p>

                      {jobTitleError ? (
                        <p
                          id={jobTitleErrorId}
                          role="alert"
                          className="mt-2 text-xs font-bold leading-5 text-red-200"
                        >
                          {jobTitleError}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section className="border-t border-white/10 pt-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      What happens next?
                    </p>

                    <div className="mt-4 grid gap-3">
                      <NextStep
                        number="01"
                        title="Create your workspace"
                        description="Intelligent Procurement creates your company workspace."
                      />

                      <NextStep
                        number="02"
                        title="Complete your company profile"
                        description="Add logo, profile details, service coverage, products, certifications, and company-network visibility."
                      />

                      <NextStep
                        number="03"
                        title="Invite team members"
                        description="Bring procurement, finance, operations, consultants, service providers, or supplier teams into the workspace."
                      />

                      <NextStep
                        number="04"
                        title="Start procurement activity"
                        description="Create RFQs, compare proposals, track awards, and open executive analytics."
                      />
                    </div>
                  </section>
                </section>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold leading-6 text-red-200"
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {currentStep !== "identity" ? (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={loading}
                    className={`${EXECUTIVE_CTA_SECONDARY} h-[58px] disabled:cursor-not-allowed disabled:opacity-50 sm:w-44`}
                  >
                    Back
                  </button>
                ) : null}

                {currentStep !== "review" ? (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={loading}
                    className={`${EXECUTIVE_CTA_PRIMARY} h-[58px] flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !formIsReady}
                    className={`${EXECUTIVE_CTA_PRIMARY} h-[58px] flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {loading
                      ? "Activating workspace…"
                      : "Activate company workspace"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Intelligent Procurement home"
      className={`inline-flex w-fit flex-col gap-2 rounded-xl outline-none transition ${EXECUTIVE_FOCUS_GOLD}`}
    >
      <NexusPavilionLogo
        variant="horizontal"
        size={72}
        priority
        className="justify-start"
      />
      <div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#F2D778]">
          Intelligent Procurement
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-400">
          A Nexus Pavilion Inc. product
        </p>
      </div>
    </Link>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-l border-white/15 pl-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function NextStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 py-1">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A646]">
        {number}
      </p>

      <div>
        <p className="text-sm font-black text-white">
          {title}
        </p>

        <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}