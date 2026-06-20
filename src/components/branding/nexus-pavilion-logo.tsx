import { useId } from "react";

type NexusPavilionMonogramProps = {
className?: string;
variant?: "full" | "flat" | "mono" | "white";
title?: string;
};

type NexusPavilionLogoProps = {
className?: string;
showTagline?: boolean;
};

export function NexusPavilionLogo({
className = "",
showTagline = true,
}: NexusPavilionLogoProps) {
return (
<div className={`flex items-center gap-5 ${className}`.trim()}>
<NexusPavilionMonogram className="h-16 w-16 shrink-0" />

<div className="hidden sm:block">
<div className="flex items-center gap-4">
<div className="h-14 w-px bg-nexus-border" />

<div>
<div className="font-sans text-4xl font-logotype uppercase leading-none tracking-np-h1 text-nexus-white">
Nexus
</div>

<div className="mt-2 bg-nexus-gradient bg-clip-text font-sans text-xl font-executive uppercase leading-none tracking-np-logo text-transparent">
Pavilion
</div>

{showTagline && (
<div className="mt-3 font-sans text-xs font-regular uppercase tracking-np-body text-nexus-muted">
Enterprise Construction Procurement Intelligence
</div>
)}
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

const blueGradient = `np-blue-${id}`;
const violetGradient = `np-violet-${id}`;
const goldGradient = `np-gold-${id}`;
const softShadow = `np-shadow-${id}`;

const isMono = variant === "mono";
const isWhite = variant === "white";

const blueFill = isWhite
? "#F8FAFC"
: isMono
? "#0B1220"
: `url(#${blueGradient})`;

const violetFill = isWhite
? "#F8FAFC"
: isMono
? "#0B1220"
: `url(#${violetGradient})`;

const goldFill = isWhite
? "#F8FAFC"
: isMono
? "#0B1220"
: `url(#${goldGradient})`;

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
id={blueGradient}
x1="130"
y1="575"
x2="420"
y2="150"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#7C3AED" />
<stop offset="34%" stopColor="#2563EB" />
<stop offset="100%" stopColor="#60A5FA" />
</linearGradient>

<linearGradient
id={violetGradient}
x1="260"
y1="560"
x2="455"
y2="210"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#4C1D95" />
<stop offset="52%" stopColor="#7C3AED" />
<stop offset="100%" stopColor="#A78BFA" />
</linearGradient>

<linearGradient
id={goldGradient}
x1="640"
y1="170"
x2="380"
y2="610"
gradientUnits="userSpaceOnUse"
>
<stop offset="0%" stopColor="#FCD34D" />
<stop offset="48%" stopColor="#F5C275" />
<stop offset="100%" stopColor="#D97706" />
</linearGradient>

<filter
id={softShadow}
x="-20%"
y="-20%"
width="140%"
height="140%"
colorInterpolationFilters="sRGB"
>
<feDropShadow
dx="0"
dy="18"
stdDeviation="18"
floodColor="#000000"
floodOpacity="0.35"
/>
</filter>
</defs>

<g filter={variant === "full" ? `url(#${softShadow})` : undefined}>
<path
d="M148 192C148 174.327 162.327 160 180 160H300C310.606 160 320.525 165.257 326.478 174.034L428.478 324.034C435.826 334.839 435.826 349.161 428.478 359.966L326.478 509.966C320.525 518.743 310.606 524 300 524H180C162.327 524 148 509.673 148 492V192Z"
fill={blueFill}
/>

<path
d="M206 246V438C206 449.046 214.954 458 226 458H280L352 352L280 246H206Z"
fill="#0B1220"
opacity={variant === "white" ? 0.9 : 1}
/>

<path
d="M286 160H338C348.606 160 358.525 165.257 364.478 174.034L466.478 324.034C473.826 334.839 473.826 349.161 466.478 359.966L364.478 509.966C358.525 518.743 348.606 524 338 524H286L394 342L286 160Z"
fill={violetFill}
opacity={variant === "flat" ? 0.92 : 1}
/>

<path
d="M652 608C652 625.673 637.673 640 620 640H500C489.394 640 479.475 634.743 473.522 625.966L371.522 475.966C364.174 465.161 364.174 450.839 371.522 440.034L473.522 290.034C479.475 281.257 489.394 276 500 276H620C637.673 276 652 290.327 652 308V608Z"
fill={goldFill}
/>

<path
d="M594 554V362C594 350.954 585.046 342 574 342H520L448 448L520 554H594Z"
fill="#0B1220"
opacity={variant === "white" ? 0.9 : 1}
/>
</g>
</svg>
);
}

export function NexusPavilionBrandCard() {
return (
<section className="relative overflow-hidden rounded-executive border border-nexus-border bg-nexus-dark bg-nexus-radial p-8 shadow-executive lg:p-10">
<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] to-transparent" />
<div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-nexus-gold/10 blur-3xl shadow-gold" />
<div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-nexus-cobalt/10 blur-3xl shadow-nexus" />

<div className="relative z-10 mb-8">
<NexusPavilionLogo />
</div>

<p className="relative z-10 font-sans text-sm font-regular uppercase tracking-np-body text-nexus-muted">
<span className="text-nexus-white">Intelligence Connected.</span>{" "}
<span className="text-nexus-gold">Infrastructure Delivered.</span>
</p>
</section>
);
}