"use client";

import { useState } from "react";

type SubmissionState = "idle" | "submitting" | "success" | "error";

const inquiryTypes = [
"General Inquiry",
"Enterprise Demo",
"Supplier Network",
"Partnership",
"Technical Support",
];

function isValidEmail(value: string) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ContactForm() {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [company, setCompany] = useState("");
const [inquiryType, setInquiryType] = useState("General Inquiry");
const [message, setMessage] = useState("");
const [website, setWebsite] = useState("");

const [submissionState, setSubmissionState] =
useState<SubmissionState>("idle");
const [statusMessage, setStatusMessage] = useState("");

const loading = submissionState === "submitting";

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

const trimmedName = name.trim();
const trimmedEmail = email.trim();
const trimmedCompany = company.trim();
const trimmedMessage = message.trim();

if (website.trim()) {
setSubmissionState("success");
setStatusMessage("Thank you. Your request has been received.");
return;
}

if (trimmedName.length < 2) {
setSubmissionState("error");
setStatusMessage("Please enter your full name.");
return;
}

if (!isValidEmail(trimmedEmail)) {
setSubmissionState("error");
setStatusMessage("Please enter a valid business email address.");
return;
}

if (trimmedMessage.length < 20) {
setSubmissionState("error");
setStatusMessage("Please include a message with at least 20 characters.");
return;
}

setSubmissionState("submitting");
setStatusMessage("");

try {
const response = await fetch("/api/contact", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
name: trimmedName,
email: trimmedEmail,
company: trimmedCompany,
inquiryType,
message: trimmedMessage,
website: website.trim(),
}),
});

let data: { message?: string } = {};

try {
data = await response.json();
} catch {
data = {};
}

if (!response.ok) {
setSubmissionState("error");
setStatusMessage(
data.message ||
"Your request could not be submitted. Please review the form and try again."
);
return;
}

setSubmissionState("success");
setStatusMessage(
data.message ||
"Your request has been received. The Nexus Pavilion team will review it and follow up shortly."
);

setName("");
setEmail("");
setCompany("");
setInquiryType("General Inquiry");
setMessage("");
setWebsite("");
} catch {
setSubmissionState("error");
setStatusMessage(
"The contact service is currently unavailable. Please try again later."
);
}
}

return (
<form
onSubmit={handleSubmit}
className="mt-8 space-y-5 rounded-[32px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6 lg:p-8"
>
<div className="hidden" aria-hidden="true">
<label htmlFor="website">Website</label>
<input
id="website"
name="website"
tabIndex={-1}
autoComplete="off"
value={website}
onChange={(event) => setWebsite(event.target.value)}
/>
</div>

<FormField label="Full name" htmlFor="name">
<input
id="name"
value={name}
onChange={(event) => setName(event.target.value)}
placeholder="Enter your full name"
required
minLength={2}
disabled={loading}
className={inputClassName}
/>
</FormField>

<FormField label="Email address" htmlFor="email">
<input
id="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder="name@company.com"
type="email"
required
disabled={loading}
className={inputClassName}
/>
</FormField>

<FormField label="Company name" htmlFor="company">
<input
id="company"
value={company}
onChange={(event) => setCompany(event.target.value)}
placeholder="Enter your company name"
disabled={loading}
className={inputClassName}
/>
</FormField>

<FormField label="Inquiry type" htmlFor="inquiryType">
<select
id="inquiryType"
value={inquiryType}
onChange={(event) => setInquiryType(event.target.value)}
disabled={loading}
className={inputClassName}
>
{inquiryTypes.map((type) => (
<option key={type}>{type}</option>
))}
</select>
</FormField>

<FormField label="Message" htmlFor="message">
<textarea
id="message"
value={message}
onChange={(event) => setMessage(event.target.value)}
placeholder="Tell us how Nexus Pavilion can help."
required
minLength={20}
rows={6}
disabled={loading}
className={`${inputClassName} resize-none`}
/>
</FormField>

{statusMessage ? (
<div
role="status"
className={
submissionState === "success"
? "rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200"
: "rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200"
}
>
{statusMessage}
</div>
) : null}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-[#E7B84A] px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-[#f0c85a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
>
{loading ? "Sending request..." : "Request Executive Consultation"}
</button>
</form>
);
}

const inputClassName =
"w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#E7B84A]/60 focus:ring-4 focus:ring-[#E7B84A]/10 disabled:cursor-not-allowed disabled:opacity-60";

function FormField({
label,
htmlFor,
children,
}: {
label: string;
htmlFor: string;
children: React.ReactNode;
}) {
return (
<div className="space-y-2">
<label
htmlFor={htmlFor}
className="block text-sm font-bold text-slate-200"
>
{label}
</label>
{children}
</div>
);
}