"use client";

import { useState } from "react";

export default function ContactForm() {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [company, setCompany] = useState("");
const [inquiryType, setInquiryType] = useState("General Inquiry");
const [message, setMessage] = useState("");

const [loading, setLoading] = useState(false);
const [successMessage, setSuccessMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

setLoading(true);
setSuccessMessage("");
setErrorMessage("");

try {
const response = await fetch("/api/contact", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
name,
email,
company,
inquiryType,
message,
}),
});

const data = await response.json();

if (!response.ok) {
setErrorMessage(data.message || "Failed to send message.");
return;
}

setSuccessMessage(
data.message || "Contact request submitted successfully."
);

setName("");
setEmail("");
setCompany("");
setInquiryType("General Inquiry");
setMessage("");
} catch (error) {
setErrorMessage("Unable to submit request.");
} finally {
setLoading(false);
}
}

return (
<form onSubmit={handleSubmit} className="mt-8 space-y-5">
<input
value={name}
onChange={(e) => setName(e.target.value)}
placeholder="Full Name"
required
className="w-full rounded-2xl border border-slate-200 p-4"
/>

<input
value={email}
onChange={(e) => setEmail(e.target.value)}
placeholder="Email Address"
type="email"
required
className="w-full rounded-2xl border border-slate-200 p-4"
/>

<input
value={company}
onChange={(e) => setCompany(e.target.value)}
placeholder="Company Name"
className="w-full rounded-2xl border border-slate-200 p-4"
/>

<select
value={inquiryType}
onChange={(e) => setInquiryType(e.target.value)}
className="w-full rounded-2xl border border-slate-200 p-4"
>
<option>General Inquiry</option>
<option>Enterprise Demo</option>
<option>Supplier Network</option>
<option>Partnership</option>
<option>Technical Support</option>
</select>

<textarea
value={message}
onChange={(e) => setMessage(e.target.value)}
placeholder="How can we help?"
required
rows={6}
className="w-full rounded-2xl border border-slate-200 p-4"
/>

{successMessage ? (
<p className="text-sm font-bold text-green-700">
{successMessage}
</p>
) : null}

{errorMessage ? (
<p className="text-sm font-bold text-red-700">
{errorMessage}
</p>
) : null}

<button
type="submit"
disabled={loading}
className="rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
>
{loading ? "Sending..." : "Send Message"}
</button>
</form>
);
}