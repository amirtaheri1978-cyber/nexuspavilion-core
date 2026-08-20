"use client";

import { useId, useState, type FormEvent } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import { getFriendlyProfessionalIdentityError } from "@/lib/auth/professional-identity-settings";
import {
  JOB_TITLE_MAX_LENGTH,
  PROFESSIONAL_NAME_MAX_LENGTH,
  normalizeJobTitle,
  normalizeProfessionalName,
  validateFounderJobTitle,
  validateProfessionalName,
} from "@/lib/auth/professional-names";

const identityInputClass = [
  "mt-2 h-[58px] w-full rounded-2xl border border-white/10 bg-[#07111F] px-5 text-sm font-semibold text-white outline-none transition",
  "placeholder:text-slate-500",
  "focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const identityReadonlyClass =
  "mt-2 h-[58px] w-full rounded-2xl border border-white/10 bg-black/20 px-5 text-sm font-semibold text-slate-400 outline-none";

type ProfessionalIdentitySettingsFormProps = {
  initialFirstName?: string;
  initialLastName?: string;
  initialJobTitle?: string;
  email: string;
  preview?: boolean;
  previewError?: string | null;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  errorCode?: string;
  firstNameError?: string | null;
  lastNameError?: string | null;
  jobTitleError?: string | null;
};

export function ProfessionalIdentitySettingsForm({
  initialFirstName = "",
  initialLastName = "",
  initialJobTitle = "",
  email,
  preview = false,
  previewError = null,
}: ProfessionalIdentitySettingsFormProps) {
  const firstNameId = useId();
  const lastNameId = useId();
  const jobTitleId = useId();
  const emailId = useId();
  const firstNameErrorId = useId();
  const lastNameErrorId = useId();
  const jobTitleErrorId = useId();
  const jobTitleHintId = useId();
  const formStatusId = useId();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState(previewError || "");

  const submittedFirstName = normalizeProfessionalName(firstName);
  const submittedLastName = normalizeProfessionalName(lastName);
  const submittedJobTitle = normalizeJobTitle(jobTitle);
  const firstNameError = attemptedSubmit
    ? validateProfessionalName(submittedFirstName, "First name", {
        required: true,
      })
    : null;
  const lastNameError = attemptedSubmit
    ? validateProfessionalName(submittedLastName, "Last name", {
        required: true,
      })
    : null;
  const jobTitleError = attemptedSubmit
    ? validateFounderJobTitle(submittedJobTitle, { required: false })
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    setSuccess("");
    setError("");

    const nextFirstNameError = validateProfessionalName(
      submittedFirstName,
      "First name",
      { required: true },
    );
    const nextLastNameError = validateProfessionalName(
      submittedLastName,
      "Last name",
      { required: true },
    );
    const nextJobTitleError = validateFounderJobTitle(submittedJobTitle, {
      required: false,
    });

    if (nextFirstNameError || nextLastNameError || nextJobTitleError) {
      return;
    }

    if (preview) {
      setSuccess("Professional identity saved.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile/professional-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          firstName: submittedFirstName,
          lastName: submittedLastName,
          jobTitle: submittedJobTitle,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SaveResponse;

      if (!response.ok || !payload.success) {
        setError(
          payload.error ||
            getFriendlyProfessionalIdentityError(payload.errorCode),
        );
        return;
      }

      setSuccess("Professional identity saved.");
    } catch {
      setError(getFriendlyProfessionalIdentityError(null));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={firstNameId}
            className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
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
            onChange={(event) => setFirstName(event.target.value)}
            disabled={saving}
            aria-invalid={Boolean(firstNameError)}
            aria-describedby={firstNameError ? firstNameErrorId : undefined}
            className={identityInputClass}
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
            className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
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
            onChange={(event) => setLastName(event.target.value)}
            disabled={saving}
            aria-invalid={Boolean(lastNameError)}
            aria-describedby={lastNameError ? lastNameErrorId : undefined}
            className={identityInputClass}
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

      <div>
        <label
          htmlFor={jobTitleId}
          className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
        >
          Job title
        </label>
        <input
          id={jobTitleId}
          type="text"
          name="jobTitle"
          autoComplete="organization-title"
          maxLength={JOB_TITLE_MAX_LENGTH}
          placeholder="Chief Procurement Officer"
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
          disabled={saving}
          aria-invalid={Boolean(jobTitleError)}
          aria-describedby={
            jobTitleError ? jobTitleErrorId : jobTitleHintId
          }
          className={identityInputClass}
        />
        <p
          id={jobTitleHintId}
          className="mt-2 text-sm font-semibold leading-6 text-slate-400"
        >
          Your title in this workspace. Leave blank to clear it.
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

      <div>
        <label
          htmlFor={emailId}
          className="block text-xs font-black uppercase tracking-[0.22em] text-slate-400"
        >
          Email
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          readOnly
          value={email}
          aria-label="Account email"
          className={identityReadonlyClass}
        />
      </div>

      {success ? (
        <div
          id={formStatusId}
          role="status"
          className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-emerald-200"
        >
          {success}
        </div>
      ) : null}

      {error ? (
        <div
          id={formStatusId}
          role="alert"
          className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm font-semibold leading-6 text-rose-200"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className={`${EXECUTIVE_CTA_PRIMARY} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {saving ? "Saving identity..." : "Save Professional Identity"}
      </button>
    </form>
  );
}
