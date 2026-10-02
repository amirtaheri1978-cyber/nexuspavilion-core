import type { ReactNode } from "react";

import { EXECUTIVE_FORM_HELPER } from "@/lib/design-system/executive-contract";

type ExecutiveInlineHintProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

/**
 * L1 Inline Hint: compact contextual explanation beside content.
 * Non-modal, always visible, caller-owned association via `id` / aria-describedby.
 */
export function ExecutiveInlineHint({
  id,
  children,
  className = "",
}: ExecutiveInlineHintProps) {
  return (
    <p
      id={id}
      className={[
        EXECUTIVE_FORM_HELPER,
        "min-w-0 max-w-full text-pretty break-words",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
