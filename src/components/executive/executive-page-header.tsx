import { useId, type ReactNode } from "react";

import {
  ExecutiveBadge,
  type ExecutiveBadgeTone,
} from "@/components/executive/executive-badge";

export type ExecutivePageHeaderStatus = {
  label: string;
  tone?: ExecutiveBadgeTone;
};

export type ExecutivePageHeaderMetadata = {
  label: string;
  value: string;
};

type ExecutivePageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  status?: ExecutivePageHeaderStatus;
  metadata?: readonly ExecutivePageHeaderMetadata[];
  actions?: ReactNode;
  className?: string;
};

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAction(action: ReactNode) {
  return action !== undefined && action !== null && action !== false && action !== "";
}

export function ExecutivePageHeader({
  title,
  eyebrow,
  description,
  status,
  metadata = [],
  actions,
  className = "",
}: ExecutivePageHeaderProps) {
  const titleId = useId();
  const visibleMetadata = metadata.filter(
    (item) => hasText(item.label) && hasText(item.value),
  );
  const showStatus = hasText(status?.label);

  return (
    <header
      aria-labelledby={titleId}
      className={["min-w-0", className].filter(Boolean).join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {hasText(eyebrow) ? (
            <p className="np-type-eyebrow text-pretty">{eyebrow}</p>
          ) : null}

          {showStatus ? (
            <div className={hasText(eyebrow) ? "mt-4" : undefined}>
              <ExecutiveBadge tone={status?.tone} size="md">
                {status?.label}
              </ExecutiveBadge>
            </div>
          ) : null}

          <h1
            id={titleId}
            className={[
              "np-type-h1 min-w-0 max-w-4xl text-pretty break-words [overflow-wrap:anywhere]",
              hasText(eyebrow) || showStatus ? "mt-4" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {title}
          </h1>

          {hasText(description) ? (
            <p className="np-type-body mt-4 min-w-0 max-w-4xl text-pretty break-words [overflow-wrap:anywhere]">
              {description}
            </p>
          ) : null}

          {visibleMetadata.length > 0 ? (
            <dl className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleMetadata.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="np-type-meta">{item.label}</dt>
                  <dd className="np-type-body mt-1 min-w-0 text-pretty break-words [overflow-wrap:anywhere]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {hasAction(actions) ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
