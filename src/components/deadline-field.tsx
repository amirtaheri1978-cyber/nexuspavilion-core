"use client";

import {
  EXECUTIVE_DATE_FIELD,
  EXECUTIVE_DATE_TIMEZONE,
  EXECUTIVE_DATE_TIMEZONE_BADGE,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_LABEL,
} from "@/lib/design-system/executive-contract";

type DeadlineFieldProps = {
label: string;
dateTimeValue: string;
timezoneValue: string;
onDateTimeChange: (value: string) => void;
onTimezoneChange: (value: string) => void;
required?: boolean;
disabled?: boolean;
helperText?: string;
ariaInvalid?: boolean;
ariaDescribedBy?: string;
};

const TIMEZONES = [
{
value: "America/Toronto",
label: "America/Toronto · Eastern Time",
},
{
value: "America/New_York",
label: "America/New_York · Eastern Time",
},
{
value: "America/Chicago",
label: "America/Chicago · Central Time",
},
{
value: "America/Denver",
label: "America/Denver · Mountain Time",
},
{
value: "America/Los_Angeles",
label: "America/Los_Angeles · Pacific Time",
},
{
value: "America/Vancouver",
label: "America/Vancouver · Pacific Time",
},
{
value: "UTC",
label: "UTC · Coordinated Universal Time",
},
];

export default function DeadlineField({
label,
dateTimeValue,
timezoneValue,
onDateTimeChange,
onTimezoneChange,
required = false,
disabled = false,
helperText,
ariaInvalid = false,
ariaDescribedBy,
}: DeadlineFieldProps) {
return (
<div className="rounded-[24px] border border-white/10 bg-[#061426]/70 p-5">
<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{label}
{required ? <span className="text-nexus-gold-bright"> *</span> : null}
</p>

{helperText ? (
<p className={`mt-2 leading-5 ${EXECUTIVE_FORM_HELPER}`}>
{helperText}
</p>
) : null}
</div>

<span className={EXECUTIVE_DATE_TIMEZONE_BADGE}>
Date + Time Zone
</span>
</div>

<div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.85fr]">
<label className="block">
<span className={`mb-2 block ${EXECUTIVE_FORM_LABEL}`}>
Date & Time
</span>

<input
type="datetime-local"
required={required}
value={dateTimeValue}
onChange={(event) => onDateTimeChange(event.target.value)}
disabled={disabled}
aria-invalid={ariaInvalid}
aria-describedby={ariaDescribedBy}
className={EXECUTIVE_DATE_FIELD}
/>
</label>

<label className="block">
<span className={`mb-2 block ${EXECUTIVE_FORM_LABEL}`}>
Time Zone
</span>

<select
value={timezoneValue}
onChange={(event) => onTimezoneChange(event.target.value)}
disabled={disabled}
className={EXECUTIVE_DATE_TIMEZONE}
>
{TIMEZONES.map((timezone) => (
<option
key={timezone.value}
value={timezone.value}
className="bg-[#061426] text-white"
>
{timezone.label}
</option>
))}
</select>
</label>
</div>
</div>
);
}
