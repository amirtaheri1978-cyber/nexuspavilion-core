"use client";

import { useState } from "react";

import styles from "@/components/corporate/corporate-contact.module.css";

type SubmissionState = "idle" | "submitting" | "success" | "error";

const inquiryTypes = ["General Inquiry", "Product Inquiry", "Partnership", "Business Inquiry", "Technical Support"];

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
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [fieldErrorTarget, setFieldErrorTarget] = useState<"name" | "email" | "message" | null>(null);

  const loading = submissionState === "submitting";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompany = company.trim();
    const trimmedMessage = message.trim();
    const trimmedWebsite = website.trim();

    if (trimmedWebsite) {
      setSubmissionState("success");
      setStatusMessage("Thank you. Your inquiry has been received.");
      return;
    }
    if (trimmedName.length < 2) {
      setFieldErrorTarget("name");
      setSubmissionState("error");
      setStatusMessage("Please enter your full name.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setFieldErrorTarget("email");
      setSubmissionState("error");
      setStatusMessage("Please enter a valid business email address.");
      return;
    }
    if (trimmedMessage.length < 20) {
      setFieldErrorTarget("message");
      setSubmissionState("error");
      setStatusMessage("Please include a message with at least 20 characters.");
      return;
    }

    setSubmissionState("submitting");
    setStatusMessage("");
    setFieldErrorTarget(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, company: trimmedCompany, inquiryType, message: trimmedMessage, website: trimmedWebsite }),
      });
      let data: { message?: string } = {};
      try { data = await response.json(); } catch { data = {}; }

      if (!response.ok) {
        setFieldErrorTarget(null);
        setSubmissionState("error");
        setStatusMessage(data.message || "Your inquiry could not be submitted. Please review the form and try again.");
        return;
      }

      setSubmissionState("success");
      setStatusMessage(data.message || "Your inquiry has been received. The Nexus Pavilion team will review it and follow up shortly.");
      setName("");
      setEmail("");
      setCompany("");
      setInquiryType("General Inquiry");
      setMessage("");
      setWebsite("");
    } catch {
      setFieldErrorTarget(null);
      setSubmissionState("error");
      setStatusMessage("The contact service is currently unavailable. Please try again later.");
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-describedby={statusMessage ? "contact-form-status" : undefined} className={styles.form}>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>

      <div className={styles.formGrid}>
        <FormField label="Full name" htmlFor="name">
          <input id="name" name="name" value={name} onChange={(event) => { setName(event.target.value); if (fieldErrorTarget === "name") setFieldErrorTarget(null); }} placeholder="Your full name" required minLength={2} disabled={loading} aria-invalid={fieldErrorTarget === "name"} aria-describedby={fieldErrorTarget === "name" ? "contact-form-status" : undefined} />
        </FormField>
        <FormField label="Email address" htmlFor="email">
          <input id="email" name="email" value={email} onChange={(event) => { setEmail(event.target.value); if (fieldErrorTarget === "email") setFieldErrorTarget(null); }} placeholder="name@company.com" type="email" required disabled={loading} aria-invalid={fieldErrorTarget === "email"} aria-describedby={fieldErrorTarget === "email" ? "contact-form-status" : undefined} />
        </FormField>
        <FormField label="Company" htmlFor="company">
          <input id="company" name="company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company or organization" disabled={loading} />
        </FormField>
        <FormField label="Inquiry type" htmlFor="inquiryType">
          <select id="inquiryType" name="inquiryType" value={inquiryType} onChange={(event) => setInquiryType(event.target.value)} disabled={loading}>
            {inquiryTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </FormField>
      </div>

      <FormField label="Message" htmlFor="message">
        <textarea id="message" name="message" value={message} onChange={(event) => { setMessage(event.target.value); if (fieldErrorTarget === "message") setFieldErrorTarget(null); }} placeholder="Share the context, objective, and where clarity would be most useful." required minLength={20} rows={6} disabled={loading} aria-invalid={fieldErrorTarget === "message"} aria-describedby={fieldErrorTarget === "message" ? "contact-form-status" : undefined} />
      </FormField>

      {statusMessage ? <div id="contact-form-status" role={submissionState === "error" ? "alert" : "status"} className={submissionState === "success" ? styles.successMessage : styles.errorMessage}>{statusMessage}</div> : null}
      <button type="submit" disabled={loading} className={styles.submit}>{loading ? "Sending inquiry…" : "Send inquiry"}<span aria-hidden="true">↗</span></button>
    </form>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className={styles.field}><label htmlFor={htmlFor}>{label}</label>{children}</div>;
}
