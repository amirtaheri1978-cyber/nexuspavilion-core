"use client";

import { useState } from "react";

import { ExecutiveEnrollmentForm } from "@/components/executive/enrollment/executive-enrollment-form";
import { ExecutiveEnrollmentGateway } from "@/components/executive/enrollment/executive-enrollment-gateway";
import { ExecutiveAccessGateway } from "@/components/executive/invitation/executive-access-gateway";
import { validateInvitationEnrollmentIdentity } from "@/lib/auth/invite-enrollment";
import {
  normalizeJobTitle,
  normalizeProfessionalName,
} from "@/lib/auth/professional-names";

export function InviteEnrollmentVisualQaFixture() {
  const [firstName, setFirstName] = useState("Alex");
  const [lastName, setLastName] = useState("Morgan");
  const [jobTitle, setJobTitle] = useState("Procurement Director");
  const [password, setPassword] = useState("securepass");
  const [confirmPassword, setConfirmPassword] = useState("securepass");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const submittedFirstName = normalizeProfessionalName(firstName);
  const submittedLastName = normalizeProfessionalName(lastName);
  const submittedJobTitle = normalizeJobTitle(jobTitle);
  const identityErrors = validateInvitationEnrollmentIdentity({
    firstName: submittedFirstName,
    lastName: submittedLastName,
    jobTitle: submittedJobTitle,
  });
  const passwordIsReady = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const formIsReady = Boolean(
    submittedFirstName &&
      submittedLastName &&
      submittedJobTitle &&
      passwordIsReady &&
      passwordsMatch,
  );

  return (
    <div className="space-y-16 bg-[#050d18] pb-16">
      <section>
        <p className="px-6 pt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d6b977]">
          Visual QA · new invite enrollment
        </p>
        <ExecutiveEnrollmentGateway
          token="visual-qa-token"
          company={{
            name: "Harbor Steel Holdings",
            category: "Industrial Procurement",
            location: "Dubai, UAE",
            logoUrl: null,
          }}
          email="alex.morgan@example.com"
          role="Procurement Buyer"
          status="Enrollment Ready"
        >
          <ExecutiveEnrollmentForm
            email="alex.morgan@example.com"
            firstName={firstName}
            lastName={lastName}
            jobTitle={jobTitle}
            password={password}
            confirmPassword={confirmPassword}
            passwordIsReady={passwordIsReady}
            passwordsMatch={passwordsMatch}
            formIsReady={formIsReady}
            submitting={false}
            message=""
            error={
              attemptedSubmit &&
              (identityErrors.firstNameError ||
                identityErrors.lastNameError ||
                identityErrors.jobTitleError)
                ? "Please enter your first name, last name, and job title to complete enrollment."
                : ""
            }
            firstNameError={
              attemptedSubmit ? identityErrors.firstNameError : null
            }
            lastNameError={
              attemptedSubmit ? identityErrors.lastNameError : null
            }
            jobTitleError={
              attemptedSubmit ? identityErrors.jobTitleError : null
            }
            passwordError={
              attemptedSubmit && !passwordIsReady
                ? "Password must be at least 8 characters."
                : null
            }
            confirmPasswordError={
              attemptedSubmit && !passwordsMatch
                ? "Passwords do not match."
                : null
            }
            unavailable={false}
            enrollmentPhase="idle"
            loginHref="/login?next=%2Finvite%2Fvisual-qa-token"
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onJobTitleChange={setJobTitle}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={(event) => {
              event.preventDefault();
              setAttemptedSubmit(true);
            }}
          />
        </ExecutiveEnrollmentGateway>
      </section>

      <section>
        <p className="px-6 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d6b977]">
          Visual QA · existing-account invite acceptance
        </p>
        <ExecutiveAccessGateway
          state="ready"
          companyName="Harbor Steel Holdings"
          companyCategory="Industrial Procurement"
          companyLocation="Dubai, UAE"
          companyLogoUrl={null}
          invitationEmail="alex.morgan@example.com"
          authenticatedEmail="alex.morgan@example.com"
          roleLabel="Procurement Buyer"
          statusLabel="Pending Identity Verification"
          statusTone="warning"
          signupHref="/invite/visual-qa-token/signup"
          loginHref="/login?next=%2Finvite%2Fvisual-qa-token"
          invitationToken="visual-qa-token"
          initialFirstName="Alex"
          initialLastName="Morgan"
          preview
        />
      </section>
    </div>
  );
}
