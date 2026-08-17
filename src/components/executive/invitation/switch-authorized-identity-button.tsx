"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const buttonClassName =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-300 px-5 py-3.5 text-center text-sm font-black text-[#151006] shadow-[0_12px_32px_rgba(252,211,77,0.12)] transition duration-200 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-60";

export function SwitchAuthorizedIdentityButton({
  loginHref,
}: {
  loginHref: string;
}) {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  async function handleSwitchIdentity() {
    if (switching) return;

    setSwitching(true);
    setError("");

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "local",
    });

    if (signOutError) {
      setSwitching(false);
      setError(
        "The current session could not be signed out. Please try again.",
      );
      return;
    }

    window.location.assign(loginHref);
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => {
          void handleSwitchIdentity();
        }}
        disabled={switching}
        className={buttonClassName}
      >
        {switching
          ? "Signing out current identity..."
          : "Sign In With Authorized Identity"}
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-sm font-semibold leading-6 text-amber-200"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
