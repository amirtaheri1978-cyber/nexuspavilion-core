"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_HELPER,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

const LOGO_BUCKET = "Company-logos";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const LOGO_EXTENSION_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const MANAGED_LOGO_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/;

type CompanyLogoUploadProps = {
  companyId: string;
  currentLogoUrl?: string | null;
  canManageBranding: boolean;
};

type LogoApiResult = {
  error?: string;
  company?: {
    logo_url?: string | null;
  };
};

function getManagedLogoObjectPath(
  value: string,
  companyId: string,
) {
  if (!value) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    const url = new URL(value);
    const allowedOrigin = new URL(supabaseUrl).origin;
    const objectPrefix =
      `/storage/v1/object/public/${LOGO_BUCKET}/${companyId}/branding/`;

    if (
      url.protocol !== "https:" ||
      url.origin !== allowedOrigin ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(objectPrefix)
    ) {
      return null;
    }

    const fileName = url.pathname.slice(objectPrefix.length);

    if (!MANAGED_LOGO_FILE_NAME.test(fileName)) {
      return null;
    }

    return `${companyId}/branding/${fileName}`;
  } catch {
    return null;
  }
}

export default function CompanyLogoUpload({
  companyId,
  currentLogoUrl,
  canManageBranding,
}: CompanyLogoUploadProps) {
  const supabase = createClient();

  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!canManageBranding) {
      setMessage(
        "You have read-only access to company branding settings.",
      );
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension =
      LOGO_EXTENSION_BY_MIME[
        file.type as keyof typeof LOGO_EXTENSION_BY_MIME
      ];

    if (!extension) {
      setMessage("Use a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size <= 0) {
      setMessage("The selected logo file is empty.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setMessage("Logo files must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");

    const filePath =
      `${companyId}/branding/${crypto.randomUUID()}.${extension}`;

    let uploadedPath: string | null = null;
    let bindingSucceeded = false;

    try {
      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Company logo upload failed.", {
          companyId,
          filePath,
          error: uploadError,
        });
        setMessage("Logo upload failed.");
        return;
      }

      uploadedPath = filePath;

      const { data } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      const response = await fetch(
        `/api/companies/${companyId}/logo`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            logoUrl: publicUrl,
          }),
        },
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as LogoApiResult;

      if (!response.ok) {
        await removeManagedObject(
          filePath,
          "binding-failure",
        );

        console.error("Company logo binding failed.", {
          companyId,
          filePath,
          status: response.status,
          result,
        });

        setMessage(
          result.error ||
            "Logo upload could not be attached to the company profile.",
        );
        return;
      }

      // From this point onward, never delete the newly bound object as
      // failure cleanup. The database has accepted it as the company logo.
      bindingSucceeded = true;

      const savedLogoUrl =
        result.company?.logo_url || publicUrl;
      const previousLogoPath = getManagedLogoObjectPath(
        logoUrl,
        companyId,
      );

      setLogoUrl(savedLogoUrl);
      setMessage("Logo updated successfully.");

      if (
        previousLogoPath &&
        previousLogoPath !== filePath
      ) {
        await removeManagedObject(
          previousLogoPath,
          "previous-logo-cleanup",
        );
      }
    } catch (error) {
      if (uploadedPath && !bindingSucceeded) {
        await removeManagedObject(
          uploadedPath,
          "binding-failure",
        );
      }

      console.error("Unexpected company logo update failure.", {
        companyId,
        uploadedPath,
        bindingSucceeded,
        error,
      });

      setMessage("Logo update could not be completed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function removeManagedObject(
    objectPath: string,
    context: "binding-failure" | "previous-logo-cleanup",
  ) {
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([objectPath]);

    if (error) {
      console.error("Company logo Storage cleanup failed.", {
        companyId,
        objectPath,
        context,
        error,
      });

      return false;
    }

    return true;
  }

  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      aria-labelledby="company-logo-heading"
    >
      <p className="np-type-eyebrow text-nexus-gold">Company Profile</p>

      <h2
        id="company-logo-heading"
        className="np-type-h2 mt-3 text-nexus-white"
      >
        Company Logo
      </h2>

      <p className={`mt-3 ${EXECUTIVE_FORM_HELPER}`}>
        Organization logo for company identity. Upload and storage rules are
        unchanged.
      </p>

      {logoUrl ? (
        <div className="mt-6">
          <Image
            src={logoUrl}
            alt="Company logo"
            width={112}
            height={112}
            className="h-28 w-28 rounded-executive border border-white/10 bg-white/[0.045] object-contain p-3"
          />
        </div>
      ) : (
        <p className={`mt-6 ${EXECUTIVE_FORM_HELPER}`}>
          No company logo uploaded.
        </p>
      )}

      <div className="mt-6">
        <label
          htmlFor="company-logo-upload"
          className="np-type-meta mb-2 block text-nexus-muted"
        >
          Upload company logo
        </label>

        <input
          id="company-logo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading || !canManageBranding}
          className={`w-full rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm font-semibold text-nexus-text-secondary file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60 ${EXECUTIVE_FOCUS_GOLD}`}
        />
      </div>

      {!canManageBranding ? (
        <p role="status" className={`mt-4 ${EXECUTIVE_FEEDBACK_WARNING}`}>
          You have read-only access to company branding settings.
        </p>
      ) : null}

      {message ? (
        <p role="status" className={`mt-4 ${EXECUTIVE_FEEDBACK_INFO}`}>
          {message}
        </p>
      ) : null}

      {uploading ? (
        <p role="status" className={`mt-4 ${EXECUTIVE_FORM_HELPER}`}>
          Uploading logo...
        </p>
      ) : null}
    </ExecutivePanel>
  );
}
