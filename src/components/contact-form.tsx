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

export default function ContactForm() {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [company, setCompany] = useState("");
const [inquiryType, setInquiryType] = useState("General Inquiry");
const [message, setMessage] = useState("");

const [submissionState, setSubmissionState] =
useState<SubmissionState>("idle");
const [statusMessage, setStatusMessage] = useState("");

const loading = submissionState === "submitting";

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setSubmissionState("submitting");
setStatusMessage("");

try {
const response = await fetch("/api/contact", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
name: name.trim(),
email: email.trim(),
company: company.trim(),
inquiryType,
message: message.trim(),
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
"Your request has been submitted successfully. The Nexus Pavilion team will review it."
);

setName("");
setEmail("");
setCompany("");
setInquiryType("General Inquiry");
setMessage("");
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
className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8"
>
<div className="space-y-2">
<label
htmlFor="name"
className="block text-sm font-semibold text-slate-900"
>
Full name
</label>
<input
id="name"
value={name}
onChange={(event) => setName(event.target.value)}
placeholder="Enter your full name"
required
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
/>
</div>

<div className="space-y-2">
<label
htmlFor="email"
className="block text-sm font-semibold text-slate-900"
>
Email address
</label>
<input
id="email"
value={email}
onChange={(event) => setEmail(event.target.value)}
placeholder="name@company.com"
type="email"
required
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
/>
</div>

<div className="space-y-2">
<label
htmlFor="company"
className="block text-sm font-semibold text-slate-900"
>
Company name
</label>
<input
id="company"
value={company}
onChange={(event) => setCompany(event.target.value)}
placeholder="Enter your company name"
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
/>
</div>

<div className="space-y-2">
<label
htmlFor="inquiryType"
className="block text-sm font-semibold text-slate-900"
>
Inquiry type
</label>
<select
id="inquiryType"
value={inquiryType}
onChange={(event) => setInquiryType(event.target.value)}
disabled={loading}
className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
>
{inquiryTypes.map((type) => (
<option key={type}>{type}</option>
))}
</select>
</div>

<div className="space-y-2">
<label
htmlFor="message"
className="block text-sm font-semibold text-slate-900"
>
Message
</label>
<textarea
id="message"
value={message}
onChange={(event) => setMessage(event.target.value)}
placeholder="Tell us how Nexus Pavilion can help."
required
rows={6}
disabled={loading}
className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
/>
</div>

{statusMessage ? (
<div
role="status"
className={
submissionState === "success"
? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
: "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
}
>
{statusMessage}
</div>
) : null}

<button
type="submit"
disabled={loading}
className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
>
{loading ? "Sending request..." : "Send message"}
</button>
</form>
);
}