import {
  getPublicSiteUrl,
  joinPublicSitePath,
} from "@/lib/ops/public-site-url";

export type TransactionalEmailCta = {
  label: string;
  url: string;
};

type TransactionalEmailShellInput = {
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  contentHtml?: string;
  noticeHtml?: string;
  cta?: TransactionalEmailCta;
  fallbackLinkLabel?: string;
  footerNote?: string;
};

export function escapeEmailHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmailSafePublicHttpsOrigin(origin: string) {
  try {
    const parsed = new URL(origin);

    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1"
    ) {
      return false;
    }

    if (host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }

    if (
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Official logo only when NEXT_PUBLIC_SITE_URL resolves to a public HTTPS origin.
 * Never emit localhost/private image URLs — Gmail cannot fetch them.
 */
function resolveEmailSafeBrandLogoUrl() {
  const origin = getPublicSiteUrl();

  if (!origin || !isEmailSafePublicHttpsOrigin(origin)) {
    return null;
  }

  return joinPublicSitePath("/branding/logo-horizontal-1024.png");
}

export function transactionalEmailInfoBlock(label: string, value: string) {
  return `
<div style="margin-top:14px;border-radius:16px;background:#081827;padding:28px 32px;border:1px solid #20354a;">
  <p style="margin:0;padding:0 4px;font-size:10px;font-weight:800;letter-spacing:0.16em;color:#8fa0b5;text-transform:uppercase;">${escapeEmailHtml(label)}</p>
  <p style="margin:7px 0 0;padding:0 4px;font-size:16px;font-weight:800;color:#f8fafc;line-height:1.45;">${escapeEmailHtml(value)}</p>
</div>
`;
}

export function transactionalEmailNotice(
  title: string,
  description: string,
) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;background:#081827;border:1px solid #20354a;border-radius:18px;">
  <tr>
    <td style="padding:28px 32px;">
      <p style="margin:0;padding:0 4px;color:#C8A646;font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;">${escapeEmailHtml(title)}</p>
      <p style="margin:11px 0 0;padding:0 4px;color:#c7d2df;font-size:14px;line-height:1.75;font-weight:500;">${escapeEmailHtml(description)}</p>
    </td>
  </tr>
</table>
`;
}

function brandHeader() {
  const logoUrl = resolveEmailSafeBrandLogoUrl();

  if (logoUrl) {
    return `
<img
  src="${escapeEmailHtml(logoUrl)}"
  width="210"
  alt="Nexus Pavilion"
  style="display:block;width:210px;max-width:72%;height:auto;border:0;outline:none;text-decoration:none;"
/>
<p style="margin:13px 0 0;color:#C8A646;font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;">
  Intelligent Procurement
</p>
<p style="margin:5px 0 0;color:#7f91a6;font-size:11px;line-height:1.4;">
  A Nexus Pavilion Inc. product
</p>
`;
  }

  return `
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">Nexus Pavilion</p>
<p style="margin:8px 0 0;color:#C8A646;font-size:10px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;">Intelligent Procurement</p>
<p style="margin:5px 0 0;color:#7f91a6;font-size:11px;line-height:1.4;">A Nexus Pavilion Inc. product</p>
`;
}

export function renderTransactionalEmail({
  preheader,
  eyebrow,
  headline,
  intro,
  contentHtml = "",
  noticeHtml = "",
  cta,
  fallbackLinkLabel = "If the button does not work, copy and paste this link into your browser:",
  footerNote,
}: TransactionalEmailShellInput) {
  const safePreheader = escapeEmailHtml(preheader);
  const safeEyebrow = escapeEmailHtml(eyebrow);
  const safeHeadline = escapeEmailHtml(headline);
  const safeIntro = escapeEmailHtml(intro);
  const safeCtaUrl = cta ? escapeEmailHtml(cta.url) : "";
  const safeCtaLabel = cta ? escapeEmailHtml(cta.label) : "";
  const safeFallback = escapeEmailHtml(fallbackLinkLabel);
  const safeFooterNote = footerNote ? escapeEmailHtml(footerNote) : "";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeHeadline}</title>
<style>
@media only screen and (max-width: 680px) {
  .np-outer { padding:16px 8px !important; }
  .np-shell { border-radius:20px !important; }
  .np-hero, .np-section, .np-footer { padding-left:22px !important; padding-right:22px !important; }
  .np-hero { padding-top:30px !important; padding-bottom:26px !important; }
  .np-title { font-size:31px !important; line-height:1.08 !important; }
  .np-intro { font-size:15px !important; }
  .np-cta { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#061426;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="np-outer" style="padding:30px 14px;background:#061426;">
<tr><td align="center">
<table width="680" cellpadding="0" cellspacing="0" border="0" class="np-shell" style="max-width:680px;width:100%;background:#07111F;border-radius:26px;overflow:hidden;border:1px solid #1f3347;box-shadow:0 24px 70px rgba(0,0,0,0.32);">
<tr>
<td class="np-hero" style="padding:38px 38px 32px;background:#07111F;border-bottom:1px solid #1f3347;">
  ${brandHeader()}
  <p style="margin:30px 0 0;color:#C8A646;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">${safeEyebrow}</p>
  <h1 class="np-title" style="margin:15px 0 0;color:#ffffff;font-size:40px;line-height:1.08;font-weight:900;letter-spacing:-1.1px;">${safeHeadline}</h1>
  <p class="np-intro" style="margin:18px 0 0;color:#cbd5e1;font-size:16px;line-height:1.75;font-weight:500;">${safeIntro}</p>
</td>
</tr>

${contentHtml ? `<tr><td class="np-section" style="padding:28px 38px 0;background:#07111F;">${contentHtml}</td></tr>` : ""}
${noticeHtml ? `<tr><td class="np-section" style="padding:4px 38px 0;background:#07111F;">${noticeHtml}</td></tr>` : ""}

${cta ? `
<tr>
<td class="np-section" style="padding:30px 38px 0;background:#07111F;">
  <a href="${safeCtaUrl}" class="np-cta" style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:15px 24px;border-radius:13px;font-weight:900;font-size:14px;letter-spacing:.7px;">${safeCtaLabel}</a>
</td>
</tr>
<tr>
<td class="np-section" style="padding:22px 38px 0;background:#07111F;">
  <p style="margin:0;color:#8393a7;font-size:12px;line-height:1.6;">${safeFallback}</p>
  <p style="margin:8px 0 0;word-break:break-all;color:#b8c4d3;font-size:12px;line-height:1.6;">${safeCtaUrl}</p>
</td>
</tr>
` : ""}

<tr>
<td class="np-footer" style="padding:30px 38px 36px;background:#07111F;">
  <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:800;">Intelligent Procurement</p>
  <p style="margin:5px 0 0;color:#8797aa;font-size:12px;line-height:1.6;">A Nexus Pavilion Inc. product</p>
  <p style="margin:10px 0 0;color:#62758a;font-size:12px;line-height:1.6;">Procurement workflows, governance and decision support.</p>
  ${safeFooterNote ? `<p style="margin:16px 0 0;color:#52677d;font-size:11px;line-height:1.6;">${safeFooterNote}</p>` : ""}
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
}
