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

type InvitationContext = {
  invite_email: string | null;
  invite_role: string | null;
  invite_status: string | null;
  invite_expires_at: string | null;
  company_name: string | null;
  company_category: string | null;
  company_location: string | null;
  company_logo_url: string | null;
};

function formatRole(role: string | null | undefined) {
  if (role === "admin") return "Workspace Administrator";
  if (role === "buyer") return "Procurement Buyer";
  return "Authorized Supplier";
}

function getInvitationLoginHref(token: string) {
  return `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
}

export default function InviteSignupPage() {
  const params = useParams<{ token: string }>();
  const supabase = useMemo(() => createClient(), []);
  const token = params.token;
  const loginHref = getInvitationLoginHref(token);

  const [invitation, setInvitation] = useState<InvitationContext | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrollmentPhase, setEnrollmentPhase] =
    useState<EnrollmentPhase>("idle");

  const passwordIsReady = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const formIsReady =
    Boolean(invitation) && passwordIsReady && passwordsMatch;

  useEffect(() => {
    async function loadInvitation() {
      setLoadingInvitation(true);
      setError("");

      const { data, error: invitationError } = await supabase
        .rpc("get_organization_invitation_context", {
          p_token: token,
        })
        .maybeSingle();

      setLoadingInvitation(false);

      if (invitationError || !data) {
        setInvitation(null);
        return;
      }

      setInvitation(data as InvitationContext);
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

    const email = (invitation.invite_email || "").trim().toLowerCase();

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

  return (
    <ExecutiveEnrollmentGateway
      token={token}
      company={{
        name: invitation.company_name || "Authorized Company Workspace",
        category: invitation.company_category || "Enterprise Procurement",
        location: invitation.company_location || "Location not specified",
        logoUrl: invitation.company_logo_url || null,
      }}
      email={invitation.invite_email || "Invited recipient"}
      role={formatRole(invitation.invite_role)}
      status="Enrollment Ready"
    >
      <ExecutiveEnrollmentForm
        email={invitation.invite_email || ""}
        password={password}
        confirmPassword={confirmPassword}
        passwordIsReady={passwordIsReady}
        passwordsMatch={passwordsMatch}
        formIsReady={formIsReady}
        submitting={submitting}
        message={message}
        error={error}
        unavailable={false}
        enrollmentPhase={enrollmentPhase}
        loginHref={loginHref}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSignup}
      />
    </ExecutiveEnrollmentGateway>
  );
}
