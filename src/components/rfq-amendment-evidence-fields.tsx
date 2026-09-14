"use client";

type RFQAmendmentEvidenceFieldsProps = {
  idPrefix: string;
  title: string;
  reason: string;
  disabled?: boolean;
  onTitleChange: (value: string) => void;
  onReasonChange: (value: string) => void;
};

export function RFQAmendmentEvidenceFields({
  idPrefix,
  title,
  reason,
  disabled = false,
  onTitleChange,
  onReasonChange,
}: RFQAmendmentEvidenceFieldsProps) {
  const titleId = `${idPrefix}-addendum-title`;
  const reasonId = `${idPrefix}-amendment-reason`;

  return (
    <fieldset className="min-w-0 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.06] p-4">
      <legend className="px-2 text-xs font-black uppercase tracking-[0.18em] text-nexus-gold-bright">
        Published RFQ amendment evidence
      </legend>
      <p className="mb-4 min-w-0 text-pretty text-sm font-semibold leading-6 text-nexus-muted">
        This material package change will issue a governed Addendum. State what
        is changing and why so respondents receive a truthful audit record.
      </p>
      <div className="grid min-w-0 gap-4">
        <label
          htmlFor={titleId}
          className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.16em] text-nexus-muted"
        >
          Addendum title *
          <input
            id={titleId}
            required
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={disabled}
            placeholder="Describe the material package change"
            className="min-h-12 min-w-0 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <label
          htmlFor={reasonId}
          className="grid min-w-0 gap-2 text-xs font-black uppercase tracking-[0.16em] text-nexus-muted"
        >
          Amendment reason *
          <textarea
            id={reasonId}
            required
            rows={3}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            disabled={disabled}
            placeholder="Explain why the published RFQ package must change"
            className="min-w-0 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold normal-case tracking-normal text-nexus-white outline-none transition placeholder:text-nexus-muted/70 focus:border-nexus-cyan/40 focus-visible:ring-2 focus-visible:ring-nexus-gold/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>
    </fieldset>
  );
}
