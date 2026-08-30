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
import {
  FRIENDLY_INVITE_ACCEPT_FAILED,
  FRIENDLY_INVITE_IDENTITY_REQUIRED,
  buildInviteSignupTransitMetadata,
  getFriendlyInviteSignInError,
  getInvitationRecoveryPath,
  isSuccessfulInvitationAcceptDestination,
  validateInvitationEnrollmentIdentity,
} from "@/lib/auth/invite-enrollment";
import {
  getFriendlySignupError,
  isExistingAccountSignupError,
} from "@/lib/auth/signup-error";
import {
  normalizeJobTitle,
  normalizeProfessionalName,
  syncCurrentUserProfessionalNames,
} from "@/lib/auth/professional-names";
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
  const value = String(role || "").trim().toLowerCase();

  if (value === "viewer") return "Read Only";
  if (value === "member") return "Standard";
  if (value === "admin") return "Administrator";
  if (value === "buyer") return "Standard";
  if (value === "vendor") return "Standard";

  return "Access Level Pending";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrollmentPhase, setEnrollmentPhase] =
    useState<EnrollmentPhase>("idle");

  const submittedFirstName = normalizeProfessionalName(firstName);
  const submittedLastName = normalizeProfessionalName(lastName);
  const submittedJobTitle = normalizeJobTitle(jobTitle);
  const identityErrors = validateInvitationEnrollmentIdentity({
    firstName: submittedFirstName,
    lastName: submittedLastName,
    jobTitle: submittedJobTitle,
  });
  const passwordError =
    attemptedSubmit && password.length < 8
      ? "Password must be at least 8 characters."
      : null;
  const confirmPasswordError =
    attemptedSubmit && password !== confirmPassword
      ? "Passwords do not match."
      : null;
  const firstNameError = attemptedSubmit ? identityErrors.firstNameError : null;
  const lastNameError = attemptedSubmit ? identityErrors.lastNameError : null;
  const jobTitleError = attemptedSubmit ? identityErrors.jobTitleError : null;
  const passwordIsReady = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const identityIsReady = Boolean(
    submittedFirstName && submittedLastName && submittedJobTitle,
  );
  const formIsReady =
    Boolean(invitation) && identityIsReady && passwordIsReady && passwordsMatch;

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
    formData.append("firstName", submittedFirstName);
    formData.append("lastName", submittedLastName);
    formData.append("jobTitle", submittedJobTitle);

    try {
      const response = await fetch("/api/company-invitations/accept", {
        method: "POST",
        body: formData,
        redirect: "follow",
        credentials: "same-origin",
      });

      if (isSuccessfulInvitationAcceptDestination(response.url)) {
        window.location.assign("/dashboard");
        return;
      }
    } catch {
      // Keep the invitation token recoverable instead of a false success.
    }

    setSubmitting(false);
    setEnrollmentPhase("idle");
    setError(FRIENDLY_INVITE_ACCEPT_FAILED);
    window.location.assign(getInvitationRecoveryPath(token));
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);

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

    if (
      identityErrors.firstNameError ||
      identityErrors.lastNameError ||
      identityErrors.jobTitleError
    ) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError(FRIENDLY_INVITE_IDENTITY_REQUIRED);
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
      options: {
        data: buildInviteSignupTransitMetadata(
          submittedFirstName,
          submittedLastName,
        ),
      },
    });

    const existingAccount = Boolean(
      signupError && isExistingAccountSignupError(signupError.message),
    );

    if (signupError && !existingAccount) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError(getFriendlySignupError(signupError.message));
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

      if (existingAccount) {
        setError(getFriendlyInviteSignInError(signInError.message));
        return;
      }

      setMessage(
        "Account created. Confirm your email if required, then sign in to complete workspace enrollment."
      );
      return;
    }

    const nameSync = await syncCurrentUserProfessionalNames(supabase, {
      firstName: submittedFirstName,
      lastName: submittedLastName,
      requireNames: true,
    });

    if (!nameSync.ok) {
      setSubmitting(false);
      setEnrollmentPhase("idle");
      setError(nameSync.error);
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
        firstName={firstName}
        lastName={lastName}
        jobTitle={jobTitle}
        password={password}
        confirmPassword={confirmPassword}
        passwordIsReady={passwordIsReady}
        passwordsMatch={passwordsMatch}
        formIsReady={formIsReady}
        submitting={submitting}
        message={message}
        error={error}
        firstNameError={firstNameError}
        lastNameError={lastNameError}
        jobTitleError={jobTitleError}
        passwordError={passwordError}
        confirmPasswordError={confirmPasswordError}
        unavailable={false}
        enrollmentPhase={enrollmentPhase}
        loginHref={loginHref}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onJobTitleChange={setJobTitle}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSignup}
      />
    </ExecutiveEnrollmentGateway>
  );
}
