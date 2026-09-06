import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";

export type RfqDecisionReadinessItem = {
  title: string;
  scope: string;
  sourcing: string;
  quotes: number;
  evaluationState: string;
  status: string;
  sourceHref?: string | null;
};

type RfqDecisionReadinessProps = {
  items: RfqDecisionReadinessItem[];
};

export function RfqDecisionReadiness({
  items,
}: RfqDecisionReadinessProps) {
  return (
    <ExecutivePanel id="rfq-evaluation-evidence" padding="lg">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
        RFQ Decision Readiness
      </p>

      <h2 className="mt-3 text-3xl font-black text-nexus-white">
        RFQ Evaluation Evidence
      </h2>

      <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-slate-400">
        Evaluation State is categorical recorded evidence. Quotation presence
        does not indicate completed evaluation, and this table does not present
        an evaluation-completion percentage.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-[#07111F] text-white">
            <tr>
              <th className="px-5 py-4 text-sm">RFQ</th>
              <th className="px-5 py-4 text-sm">Scope</th>
              <th className="px-5 py-4 text-sm">Sourcing</th>
              <th className="px-5 py-4 text-sm">Quotes</th>
              <th className="px-5 py-4 text-sm">Evaluation State</th>
              <th className="px-5 py-4 text-sm">RFQ Status</th>
            </tr>
          </thead>

          <tbody className="bg-[#061426]/70">
            {items.map((rfq) => (
              <tr key={rfq.title} className="border-t border-white/10">
                <td className="px-5 py-4 font-bold text-white">
                  {rfq.sourceHref ? (
                    <Link
                      href={rfq.sourceHref}
                      className="text-white underline-offset-4 hover:underline"
                    >
                      {rfq.title}
                    </Link>
                  ) : (
                    rfq.title
                  )}
                </td>
                <td className="px-5 py-4 text-slate-300">{rfq.scope}</td>
                <td className="px-5 py-4 text-slate-300">{rfq.sourcing}</td>
                <td className="px-5 py-4 text-slate-300">{rfq.quotes}</td>
                <td className="px-5 py-4 font-black text-emerald-300">
                  {rfq.evaluationState}
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-bold text-slate-200">
                    {rfq.status}
                  </span>
                </td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                >
                  No RFQ decision evidence available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ExecutivePanel>
  );
}
