import Image from "next/image";
import * as React from "react";

export type NexusPavilionLogoProps = React.HTMLAttributes<HTMLDivElement> & {
variant?:
| "horizontal"
| "full"
| "footer"
| "icon"
| "mark"
| "stacked";
size?: number;
priority?: boolean;
};

const logoMap = {
horizontal: "/branding/logo-horizontal-1024.png",
full: "/branding/logo-horizontal-1024.png",
footer: "/branding/logo-horizontal-1024.png",
icon: "/branding/logo-icon-512.png",
mark: "/branding/logo-icon-512.png",
stacked: "/branding/logo-stacked-1024.png",
} as const;


export function NexusPavilionLogo({
className = "",
variant = "horizontal",
size = 104,
priority = false,
...props
}: NexusPavilionLogoProps) {
const src = logoMap[variant];

const dimensions =
variant === "horizontal" ||
variant === "footer" ||
variant === "full"
? { width: size * 3, height: size }
: variant === "stacked"
? { width: size, height: size * 1.25 }
: { width: size, height: size };

return (
<div
className={`flex items-center justify-center bg-transparent ${className}`}
{...props}
>
<Image
src={src}
alt="NexusPavilion"
width={dimensions.width}
height={dimensions.height}
priority={priority}
className="h-auto w-auto select-none object-contain"
/>
</div>
);
}

export function NexusPavilionMonogram({
className = "",
size = 48,
...props
}: NexusPavilionLogoProps) {
return (
<NexusPavilionLogo
className={className}
size={size}
variant="icon"
{...props}
/>
);
}

export default NexusPavilionLogo;