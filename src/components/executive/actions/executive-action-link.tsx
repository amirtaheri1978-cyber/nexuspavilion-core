import Link from "next/link";

type ExecutiveActionLinkProps = {
  href: string;
  label: string;
  direction?: "forward" | "down";
};

export function ExecutiveActionLink({
  href,
  label,
  direction = "forward",
}: ExecutiveActionLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-4 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
    >
      <span>{label}</span>
      <span>{direction === "down" ? "↓" : "→"}</span>
    </Link>
  );
}