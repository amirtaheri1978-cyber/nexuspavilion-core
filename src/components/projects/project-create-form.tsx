"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_FOCUS_CYAN,
} from "@/lib/design-system/executive-contract";

type FormState = {
  name: string;
  projectCode: string;
  ownerClient: string;
  location: string;
};

const initialState: FormState = {
  name: "",
  projectCode: "",
  ownerClient: "",
  location: "",
};

export function ProjectCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          project_code: form.projectCode,
          owner_client: form.ownerClient,
          location: form.location,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        project?: {
          id: string;
        };
      };

      if (!response.ok || !result.project) {
        setError(result.error || "Unable to create the Project record.");
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch {
      setError("Unable to create the Project record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectInput
          label="Project Name"
          value={form.name}
          onChange={(value) => updateField("name", value)}
          required
          maxLength={180}
          autoComplete="organization-title"
          help="The company-level Project name. This record is independent from any RFQ."
        />

        <ProjectInput
          label="Project Code"
          value={form.projectCode}
          onChange={(value) => updateField("projectCode", value)}
          maxLength={80}
          help="Optional internal company identifier. When supplied, it must be unique within the company workspace."
        />

        <ProjectInput
          label="Owner / Client"
          value={form.ownerClient}
          onChange={(value) => updateField("ownerClient", value)}
          maxLength={180}
          help="Optional project owner or client context."
        />

        <ProjectInput
          label="Location"
          value={form.location}
          onChange={(value) => updateField("location", value)}
          maxLength={180}
          autoComplete="address-level2"
          help="Optional project location or market."
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-6 rounded-[18px] border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm font-bold text-rose-200"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <button
          type="submit"
          disabled={submitting}
          className={`${EXECUTIVE_CTA_PRIMARY} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {submitting ? "Creating Project..." : "Create Project"}
        </button>

        <Link href="/projects" className={EXECUTIVE_CTA_SECONDARY}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function ProjectInput({
  label,
  value,
  onChange,
  help,
  required = false,
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help: string;
  required?: boolean;
  maxLength: number;
  autoComplete?: string;
}) {
  const id = `project-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
        {label}
        {required ? <span className="text-[#F5D77B]"> *</span> : null}
      </span>

      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        className={`mt-3 min-h-12 w-full rounded-[16px] border border-white/10 bg-[#061426]/80 px-4 text-sm font-bold text-white placeholder:text-slate-600 ${EXECUTIVE_FOCUS_CYAN}`}
      />

      <span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
        {help}
      </span>
    </label>
  );
}
