import { useId } from "react";

type NexusPavilionMonogramProps = {
className?: string;
variant?: "full" | "flat" | "mono" | "white" | "seal";
title?: string;
};

type NexusPavilionLogoProps = {
className?: string;
showTagline?: boolean;
mode?: "default" | "compact";
};

type NexusPavilionSealProps = {
className?: string;
};

export function NexusPavilionLogo({
className = "",
showTagline = true,
mode = "default",
}: NexusPavilionLogoProps) {
const compact = mode === "compact";

return (
<div className={`flex items-center gap-4 ${className}`.trim()}>
<NexusPavilionMonogram
className={compact ? "h-11 w-11 shrink-0" : "h-14 w-14 shrink-0"}
/>

<div className="hidden sm:block">
<div className="flex items-center gap-4">
<div className="h-12 w-px bg-nexus-border" />

<div>
<div className="font-sans text-3xl font-logotype uppercase leading-none tracking-np-h1 text-nexus-white">
Nexus
</div>

<div className="mt-1.5 bg-nexus-gradient bg-clip-text font-sans text-lg font-executive uppercase leading-none tracking-np-logo text-transparent">
Pavilion
</div>

{showTagline ? (
<div className="mt-2.5 max-w-sm font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-nexus-muted">
Executive Procurement Intelligence
</div>
) : null}
</div>
</div>
</div>
</div>
);
}

export function NexusPavilionMonogram({
className = "",
variant = "full",
title = "Nexus Pavilion monogram",
}: NexusPavilionMonogramProps) {
const id = useId();

const primaryGradient = `np-primary-${id}`;
const ribbonGradient = `np-ribbon-${id}`;
const goldGradient = `np-gold-${id}`;
const innerGlow = `np-glow-${id}`;
const executiveShadow = `np-shadow-${id}`;

const isMono = variant === "mono";
const isWhite = variant === "white";
const isSeal = variant === "seal";

const primaryFill = isWhite
? "#F8FAFC"
: isMono
? "#081220"
: `url(#${primaryGradient})`;

const ribbonFill = isWhite
? "#F8FAFC"
: isMono
? "#081220"
: `url(#${ribbonGradient})`;

const goldFill = isWhite
? "#F8FAFC"
: isMono
? "#081220"
: `url(#${goldGradient})`;

const coreFill = isWhite ? "#081220" : "#F8FAFC";

return (
<svg
viewBox="0 0 800 800"
role="img"
aria-label={title}
focusable="false"
className={`overflow-visible ${className}`.trim()}
>
<defs>
<linearGradient
id={primaryGradient}
x1="128"
y1="640"
x2="520"
y2="120"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#081220" />
<stop offset="45%" stopColor="#2563EB" />
<stop offset="100%" stopColor="#7C3AED" />
</linearGradient>

<linearGradient
id={ribbonGradient}
x1="220"
y1="620"
x2="590"
y2="160"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#0B1220" />
<stop offset="45%" stopColor="#2563EB" />
<stop offset="100%" stopColor="#60A5FA" />
</linearGradient>

<linearGradient
id={goldGradient}
x1="610"
y1="130"
x2="330"
y2="650"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#F5C275" />
<stop offset="52%" stopColor="#D4A757" />
<stop offset="100%" stopColor="#A16207" />
</linearGradient>

<radialGradient
id={innerGlow}
cx="50%"
cy="44%"
r="58%"
>
<stop offset="0%" stopColor="#60A5FA" stopOpacity="0.35" />
<stop offset="58%" stopColor="#2563EB" stopOpacity="0.1" />
<stop offset="100%" stopColor="#081220" stopOpacity="0" />
</radialGradient>

<filter
id={executiveShadow}
x="-24%"
y="-24%"
width="148%"
height="148%"
colorInterpolationFilters="sRGB"
>
<feDropShadow
dx="0"
dy="20"
stdDeviation="18"
floodColor="#000000"
floodOpacity="0.32"
/>
</filter>
</defs>

{isSeal ? (
<circle
cx="400"
cy="400"
r="324"
fill="none"
stroke={goldFill}
strokeWidth="28"
opacity="0.9"
/>
) : null}

<g filter={variant === "full" || isSeal ? `url(#${executiveShadow})` : undefined}>
<path
d="M168 190C168 172.327 182.327 158 200 158H314C325.008 158 335.245 163.663 341.096 172.986L478.096 391.986C484.633 402.424 484.633 415.576 478.096 426.014L341.096 645.014C335.245 654.337 325.008 660 314 660H200C182.327 660 168 645.673 168 628V190Z"
fill={primaryFill}
/>

<path
d="M238 254V564H300L406 410L300 254H238Z"
fill="#081220"
opacity={isWhite ? 0.86 : 0.96}
/>

<path
d="M314 158H382C393.008 158 403.245 163.663 409.096 172.986L546.096 391.986C552.633 402.424 552.633 415.576 546.096 426.014L409.096 645.014C403.245 654.337 393.008 660 382 660H314L452 409L314 158Z"
fill={ribbonFill}
opacity={variant === "flat" ? 0.9 : 1}
/>

<path
d="M632 610C632 627.673 617.673 642 600 642H486C474.992 642 464.755 636.337 458.904 627.014L321.904 408.014C315.367 397.576 315.367 384.424 321.904 373.986L458.904 154.986C464.755 145.663 474.992 140 486 140H600C617.673 140 632 154.327 632 172V610Z"
fill={goldFill}
/>

<path
d="M562 546V236H500L394 390L500 546H562Z"
fill="#081220"
opacity={isWhite ? 0.86 : 0.96}
/>

<circle
cx="400"
cy="400"
r="74"
fill={`url(#${innerGlow})`}
/>

<circle
cx="400"
cy="400"
r="28"
fill={coreFill}
opacity={isMono ? 0.18 : 0.9}
/>

<path
d="M400 318L468 400L400 482L332 400L400 318Z"
fill="none"
stroke={isWhite ? "#081220" : "#F8FAFC"}
strokeWidth="18"
strokeLinejoin="round"
opacity={isMono ? 0.18 : 0.72}
/>
</g>
</svg>
);
}

export function NexusPavilionSeal({ className = "" }: NexusPavilionSealProps) {
return (
<div
className={[
"relative inline-flex items-center justify-center rounded-full",
"border border-yellow-300/25 bg-nexus-dark p-4 shadow-executive",
className,
]
.filter(Boolean)
.join(" ")}
>
<NexusPavilionMonogram
variant="seal"
className="h-full w-full"
title="Nexus Pavilion executive seal"
/>

<div className="pointer-events-none absolute inset-3 rounded-full border border-white/10" />
</div>
);
}

export function NexusPavilionBrandCard() {
return (
<section className="relative overflow-hidden rounded-executive border border-nexus-border bg-nexus-dark bg-nexus-radial p-8 shadow-executive lg:p-10">
<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] to-transparent" />
<div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-nexus-gold/10 blur-3xl shadow-gold" />
<div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-nexus-cobalt/10 blur-3xl shadow-nexus" />

<div className="relative z-10 mb-8">
<NexusPavilionLogo />
</div>

<p className="relative z-10 font-sans text-sm font-bold uppercase tracking-[0.16em] text-nexus-muted">
<span className="text-nexus-white">Intelligence Connected.</span>{" "}
<span className="text-nexus-gold">Infrastructure Delivered.</span>
</p>
</section>
);
}