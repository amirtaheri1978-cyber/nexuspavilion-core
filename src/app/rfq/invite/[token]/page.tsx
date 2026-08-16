import Link from "next/link";

import SubmitQuoteForm from "@/components/submit-quote-form";
import { createClient } from "@/lib/supabase/server";

type InvitationContext = {
  invite_id: string;
  invite_email: string;
  invite_status: string;
  rfq_id: string;
  rfq_title: string;
  rfq_slug: string;
  rfq_description: string | null;
  rfq_category: string | null;
  rfq_location: string | null;
  rfq_budget: string | null;
  rfq_deadline: string;
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cleanToken = token.trim();
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_rfq_invitation_context", { p_token: cleanToken })
    .maybeSingle();

  const invitation = data as InvitationContext | null;

  if (error || !invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Invalid or Expired Invitation
          </h1>
          <p className="mt-4 text-slate-600">
            This invitation is unavailable, expired, or no longer open for
            quotations.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500">
            Supplier Invitation
          </p>

          <h1 className="mt-3 text-5xl font-black text-slate-950">
            You’ve been invited to quote
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Invitation sent to{" "}
            <span className="font-bold text-slate-950">
              {invitation.invite_email}
            </span>
          </p>

          <div className="mt-10 rounded-3xl bg-slate-50 p-8">
            <h2 className="text-4xl font-black text-slate-950">
              {invitation.rfq_title}
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              {invitation.rfq_description}
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Info title="Category" value={invitation.rfq_category} />
              <Info title="Location" value={invitation.rfq_location} />
              <Info title="Budget" value={invitation.rfq_budget} />
              <Info title="Deadline" value={invitation.rfq_deadline} />
            </div>
          </div>

          <div className="mt-8">
            <Link
              href={`/rfq/${invitation.rfq_slug}`}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
            >
              Open RFQ Page
            </Link>
          </div>
        </section>

        <SubmitQuoteForm rfqId={invitation.rfq_id} />
      </div>
    </main>
  );
}

function Info({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-white p-5">
      <p className="text-sm font-semibold uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-lg font-bold text-slate-950">
        {value || "Not specified"}
      </p>
    </div>
  );
}