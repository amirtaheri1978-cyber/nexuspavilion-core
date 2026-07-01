"use client";

type DeadlineFieldProps = {
label: string;
dateTimeValue: string;
timezoneValue: string;
onDateTimeChange: (value: string) => void;
onTimezoneChange: (value: string) => void;
required?: boolean;
disabled?: boolean;
helperText?: string;
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
}: DeadlineFieldProps) {
return (
<div className="rounded-[24px] border border-white/10 bg-[#061426]/70 p-5">
<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{label}
{required ? <span className="text-[#F5D77B]"> *</span> : null}
</p>

{helperText ? (
<p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
{helperText}
</p>
) : null}
</div>

<span className="w-fit rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#9BE8F8]">
Date + Time Zone
</span>
</div>

<div className="mt-5 grid gap-4 md:grid-cols-[1fr_0.85fr]">
<label className="block">
<span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
Date & Time
</span>

<input
type="datetime-local"
required={required}
value={dateTimeValue}
onChange={(event) => onDateTimeChange(event.target.value)}
disabled={disabled}
className="w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<label className="block">
<span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
Time Zone
</span>

<select
value={timezoneValue}
onChange={(event) => onTimezoneChange(event.target.value)}
disabled={disabled}
className="w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-4 text-sm font-bold text-white outline-none transition focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
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