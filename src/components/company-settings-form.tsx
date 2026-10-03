"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_SELECT,
} from "@/lib/design-system/executive-contract";

type CompanySettingsFormProps = {
  companyId: string;
  initialName: string;
  initialCategory: string;
  initialLocation: string;
  initialNetworkRole: string;
  canUpdateCompany: boolean;
};

type UpdateCompanyResponse = {
  success?: boolean;
  error?: string;
};

const NETWORK_ROLE_OPTIONS = [
  "Owner / Developer",
  "General Contractor",
  "Architect / Designer",
  "Manufacturer",
  "Vendor / Supplier",
  "Consultant",
];

const fieldLabelClass = "np-type-meta mb-2 block text-nexus-muted";

export default function CompanySettingsForm({
  companyId,
  initialName,
  initialCategory,
  initialLocation,
  initialNetworkRole,
  canUpdateCompany,
}: CompanySettingsFormProps) {
  const router = useRouter();
  const nameId = useId();
  const categoryId = useId();
  const locationId = useId();
  const networkRoleId = useId();
  const networkRoleHintId = useId();
  const readOnlyNoticeId = useId();
  const formStatusId = useId();

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [location, setLocation] = useState(initialLocation);
  const [networkRole, setNetworkRole] = useState(initialNetworkRole);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpdateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUpdateCompany) {
      setError(
        "Your current role has read-only access to company profile settings.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          location,
          networkRole,
        }),
      });

      const data = (await response.json()) as UpdateCompanyResponse;

      if (!response.ok) {
        setError(data.error || "Failed to update company.");
        setLoading(false);
        return;
      }

      setMessage("Company settings updated successfully.");
      router.refresh();
    } catch (requestError) {
      console.error(requestError);
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleUpdateCompany} className="mt-6 space-y-5" noValidate>
      <div className="min-w-0">
        <label htmlFor={nameId} className={fieldLabelClass}>
          Company Name
        </label>
        <input
          id={nameId}
          type="text"
          name="companyName"
          required
          disabled={!canUpdateCompany || loading}
          placeholder="Northline Development Group"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={EXECUTIVE_FORM_INPUT}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={categoryId} className={fieldLabelClass}>
            Category
          </label>
          <input
            id={categoryId}
            type="text"
            name="category"
            disabled={!canUpdateCompany || loading}
            placeholder="General Contractor"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={EXECUTIVE_FORM_INPUT}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={locationId} className={fieldLabelClass}>
            Location
          </label>
          <input
            id={locationId}
            type="text"
            name="location"
            disabled={!canUpdateCompany || loading}
            placeholder="Toronto, ON"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={EXECUTIVE_FORM_INPUT}
          />
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={networkRoleId} className={fieldLabelClass}>
          Network Role
        </label>
        <select
          id={networkRoleId}
          name="networkRole"
          disabled={!canUpdateCompany || loading}
          value={networkRole}
          onChange={(event) => setNetworkRole(event.target.value)}
          aria-describedby={networkRoleHintId}
          className={EXECUTIVE_FORM_SELECT}
        >
          {NETWORK_ROLE_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-nexus-navy text-white">
              {option}
            </option>
          ))}
        </select>
        <p id={networkRoleHintId} className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
          Network Role describes the organization&apos;s market/network position.
          It does not grant workspace permissions.
        </p>
      </div>

      {!canUpdateCompany ? (
        <Notice id={readOnlyNoticeId} tone="warning">
          Your current role has read-only access to company profile settings.
        </Notice>
      ) : null}

      {message ? (
        <Notice id={formStatusId} tone="success">
          {message}
        </Notice>
      ) : null}

      {error ? (
        <Notice id={formStatusId} tone="danger">
          {error}
        </Notice>
      ) : null}

      <button
        type="submit"
        disabled={loading || !canUpdateCompany}
        className={`${EXECUTIVE_CTA_PRIMARY} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {loading ? "Saving changes..." : "Save Company Settings"}
      </button>
    </form>
  );
}

function Notice({
  children,
  tone,
  id,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger";
  id?: string;
}) {
  const toneClass =
    tone === "success"
      ? EXECUTIVE_FEEDBACK_SUCCESS
      : tone === "warning"
        ? EXECUTIVE_FEEDBACK_WARNING
        : EXECUTIVE_FEEDBACK_ERROR;

  return (
    <div
      id={id}
      role={tone === "success" ? "status" : "alert"}
      className={`${toneClass} text-sm font-bold leading-6`}
    >
      {children}
    </div>
  );
}
