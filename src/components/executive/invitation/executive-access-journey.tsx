import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";

export type ExecutiveAccessState =
  | "unauthenticated"
  | "identity_mismatch"
  | "expired"
  | "accepted"
  | "unavailable"
  | "ready";

type JourneyStepStatus = "complete" | "current" | "blocked" | "pending";

type JourneyStep = {
  label: string;
  shortLabel: string;
  description: string;
  status: JourneyStepStatus;
};

type ExecutiveAccessJourneyProps = {
  state: ExecutiveAccessState;
};

function getJourneySteps(state: ExecutiveAccessState): JourneyStep[] {
  if (state === "accepted") {
    return [
      {
        label: "Invitation Record",
        shortLabel: "Invitation",
        description: "Workspace authorization validated.",
        status: "complete",
      },
      {
        label: "Recipient Identity",
        shortLabel: "Identity",
        description: "Authorized identity confirmed.",
        status: "complete",
      },
      {
        label: "Role Authorization",
        shortLabel: "Role",
        description: "Assigned permissions approved.",
        status: "complete",
      },
      {
        label: "Workspace Provisioning",
        shortLabel: "Workspace",
        description: "Executive workspace access activated.",
        status: "complete",
      },
    ];
  }

  if (state === "ready") {
    return [
      {
        label: "Invitation Record",
        shortLabel: "Invitation",
        description: "Workspace authorization validated.",
        status: "complete",
      },
      {
        label: "Recipient Identity",
        shortLabel: "Identity",
        description: "Authorized identity confirmed.",
        status: "complete",
      },
      {
        label: "Role Authorization",
        shortLabel: "Role",
        description: "Assigned permissions are ready for activation.",
        status: "complete",
      },
      {
        label: "Workspace Provisioning",
        shortLabel: "Workspace",
        description: "Confirm acceptance to activate workspace access.",
        status: "current",
      },
    ];
  }

  if (state === "identity_mismatch") {
    return [
      {
        label: "Invitation Record",
        shortLabel: "Invitation",
        description: "Workspace authorization validated.",
        status: "complete",
      },
      {
        label: "Recipient Identity",
        shortLabel: "Identity",
        description: "Current session does not match the authorized recipient.",
        status: "blocked",
      },
      {
        label: "Role Authorization",
        shortLabel: "Role",
        description: "Assignment remains protected until identity is verified.",
        status: "pending",
      },
      {
        label: "Workspace Provisioning",
        shortLabel: "Workspace",
        description: "Access activation remains unavailable.",
        status: "pending",
      },
    ];
  }

  if (state === "expired" || state === "unavailable") {
    return [
      {
        label: "Invitation Record",
        shortLabel: "Invitation",
        description:
          state === "expired"
            ? "The authorization record has expired."
            : "The authorization record is no longer active.",
        status: "blocked",
      },
      {
        label: "Recipient Identity",
        shortLabel: "Identity",
        description: "Identity verification is unavailable.",
        status: "pending",
      },
      {
        label: "Role Authorization",
        shortLabel: "Role",
        description: "No permissions can be assigned.",
        status: "pending",
      },
      {
        label: "Workspace Provisioning",
        shortLabel: "Workspace",
        description: "A new authorization is required.",
        status: "pending",
      },
    ];
  }

  return [
    {
      label: "Invitation Record",
      shortLabel: "Invitation",
      description: "Workspace authorization validated.",
      status: "complete",
    },
    {
      label: "Recipient Identity",
      shortLabel: "Identity",
      description: "Sign in or create the authorized recipient account.",
      status: "current",
    },
    {
      label: "Role Authorization",
      shortLabel: "Role",
      description: "Assigned permissions remain protected.",
      status: "pending",
    },
    {
      label: "Workspace Provisioning",
      shortLabel: "Workspace",
      description: "Access activates after identity confirmation.",
      status: "pending",
    },
  ];
}

function getProgressValue(steps: JourneyStep[]) {
  const completeSteps = steps.filter((step) => step.status === "complete").length;
  const hasCurrentStep = steps.some((step) => step.status === "current");

  return Math.min(100, completeSteps * 25 + (hasCurrentStep ? 12 : 0));
}

function getStatusPresentation(status: JourneyStepStatus) {
  if (status === "complete") {
    return {
      badge: "Complete",
      badgeTone: "success" as const,
      marker:
        "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
      connector: "bg-emerald-400/40",
    };
  }

  if (status === "current") {
    return {
      badge: "Current",
      badgeTone: "gold" as const,
      marker: "border-[#2CC4E8]/35 bg-[#2CC4E8]/10 text-cyan-200",
      connector: "bg-white/10",
    };
  }

  if (status === "blocked") {
    return {
      badge: "Blocked",
      badgeTone: "warning" as const,
      marker: "border-orange-400/30 bg-orange-400/10 text-orange-300",
      connector: "bg-white/10",
    };
  }

  return {
    badge: "Pending",
    badgeTone: "neutral" as const,
    marker: "border-white/10 bg-white/[0.04] text-nexus-text-secondary",
    connector: "bg-white/10",
  };
}

export function ExecutiveAccessJourney({
  state,
}: ExecutiveAccessJourneyProps) {
  const steps = getJourneySteps(state);
  const progressValue = getProgressValue(steps);
  const activeStep =
    steps.find((step) => step.status === "current") ??
    steps.find((step) => step.status === "blocked") ??
    steps[steps.length - 1];

  return (
    <ExecutivePanel variant="operational" padding="md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-nexus-gold">
            Access Journey
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-nexus-white">
            Secure workspace activation
          </h2>
        </div>

        <ExecutiveBadge tone="board" size="md">
          {progressValue}% verified
        </ExecutiveBadge>
      </div>

      <ExecutiveProgress
        value={progressValue}
        label="Workspace access activation progress"
        className="mt-5"
      />

      <ol className="mt-5 grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const presentation = getStatusPresentation(step.status);

          return (
            <li key={step.label} className="relative min-w-0">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-4 hidden h-px sm:block ${presentation.connector}`}
                />
              ) : null}

              <div className="relative flex items-center gap-3 sm:flex-col sm:items-start">
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${presentation.marker}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 sm:mt-2">
                  <p className="text-sm font-extrabold text-nexus-white">
                    {step.shortLabel}
                  </p>
                  <ExecutiveBadge
                    tone={presentation.badgeTone}
                    className="mt-1.5"
                  >
                    {presentation.badge}
                  </ExecutiveBadge>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-text-muted">
          Current Control
        </p>
        <p className="mt-2 text-sm font-extrabold text-nexus-white">
          {activeStep.label}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-nexus-text-secondary">
          {activeStep.description}
        </p>
      </div>
    </ExecutivePanel>
  );
}
