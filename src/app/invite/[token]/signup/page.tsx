"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ExecutiveEnrollmentForm,
  type EnrollmentPhase,
} from "@/components/executive/enrollment/executive-enrollment-form";
import { ExecutiveEnrollmentGateway } from "@/components/executive/enrollment/executive-enrollment-gateway";
import {
  ExecutiveEnrollmentLoading,
  ExecutiveEnrollmentState,
} from "@/components/executive/enrollment/executive-enrollment-state";
import { createClient } from "@/lib/supabase/client";

type CompanyRecord = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  logo_url: string | null;
};

type InvitationRecord = {
  id: string;
  company_id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  token: string | null;
  expires_at: string | null;
  companies: CompanyRecord | CompanyRecord[] | null;
};

function formatRole(role: string | null | undefined) {
  if (role === "admin") return "Workspace Administrator";
  if (role === "buyer") return "Procurement Buyer";
  return "Authorized Supplier";
}

function formatStatus(status: string | null | undefined, expired: boolean) {
  if (expired) return "Expired";
  if (status === "pending") return "Enrollment Ready";
  if (status === "accepted") return "Access Activated";

  return status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : "Status Unavailable";
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export default function InviteSignupPage() {
  const params = useParams<{ token: string }>();
  const supabase = useMemo(() => createClient(), []);
  const token = params.token;

  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrollmentPhase, setEnrollmentPhase] =
    useState<EnrollmentPhase>("idle");

  const company = Array.isArray(invitation?.companies)
    ? invitation.companies[0]
    : invitation?.companies;

  const passwordIsReady = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const formIsReady =
    Boolean(invitation) && passwordIsReady && passwordsMatch;

  useEffect(() => {
    async function loadInvitation() {
      setLoadingInvitation(true);
      setError("");

      const { data, error: invitationError } = await supabase
        .from("invitations")
        .select(
          `
            id,
            company_id,
            email,
            role,
            status,
            token,
            expires_at,
            companies (
              id,
              name,
              category,
              location,
              logo_url
            )
          `
        )
        .eq("token", token)
        .single();

      setLoadingInvitation(false);

      if (invitationError || !data) {
        setError("Invitation not found or no longer available.");
        setInvitation(null);
        return;
      }

      setInvitation(data as InvitationRecord);
    }

    void loadInvitation();
  }, [supabase, token]);

  async function acceptInvitationAfterSignup() {
    setEnrollmentPhase("activating-workspace");

    const formData = new FormData();
    formData.append("token", token);

    await fetch("/api/company-invitations/accept", {
      method: "POST",
      body: formData,
      redirect: "manual",
    });

    window.location.assign("/dashboard");
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setEnrollmentPhase("creating-account");
    setMessage("");
    setError("");

    if (!invitation) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("Invitation could not be loaded.");
      return;
    }

    if (invitation.status !== "pending") {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("This invitation is no longer pending.");
      return;
    }

    if (isExpired(invitation.expires_at)) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("This invitation has expired.");
      return;
    }

    if (!passwordIsReady) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!passwordsMatch) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("Passwords do not match.");
      return;
    }

    const email = (invitation.email || "").trim().toLowerCase();

    if (!email) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError("Invitation email is missing.");
      return;
    }

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (
      signupError &&
      !signupError.message.toLowerCase().includes("already")
    ) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError(signupError.message);
      return;
    }

    setEnrollmentPhase("verifying-identity");

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setMessage(
        "Account created. Confirm your email if required, then sign in to complete workspace enrollment."
      );
      return;
    }

    await acceptInvitationAfterSignup();
  }

  if (loadingInvitation) {
    return <ExecutiveEnrollmentLoading />;
  }

  if (!invitation) {
    return (
      <ExecutiveEnrollmentState
        eyebrow="Access Validation Failed"
        title="Invitation unavailable"
        description="This invitation link is invalid, expired, or no longer exists. Return to sign in or request a new invitation from the workspace administrator."
        actionLabel="Return to Secure Sign In"
        actionHref="/login"
        tone="danger"
      />
    );
  }

  const expired = isExpired(invitation.expires_at);
  const unavailable = invitation.status !== "pending" || expired;

  return (
    <ExecutiveEnrollmentGateway
      token={token}
      company={{
        name: company?.name || "Authorized Company Workspace",
        category: company?.category || "Enterprise Procurement",
        location: company?.location || "Location not specified",
        logoUrl: company?.logo_url || null,
      }}
      email={invitation.email || "Invited recipient"}
      role={formatRole(invitation.role)}
      status={formatStatus(invitation.status, expired)}
    >
      <ExecutiveEnrollmentForm
        email={invitation.email || ""}
        password={password}
        confirmPassword={confirmPassword}
        passwordIsReady={passwordIsReady}
        passwordsMatch={passwordsMatch}
        formIsReady={formIsReady}
        submitting={submitting}
        message={message}
        error={error}
        unavailable={unavailable}
        enrollmentPhase={enrollmentPhase}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSignup}
      />
    </ExecutiveEnrollmentGateway>
  );
}
