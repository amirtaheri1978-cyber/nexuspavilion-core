type ExecutiveActionAnchorProps = {
  href: string;
  label: string;
};

export function ExecutiveActionAnchor({
  href,
  label,
}: ExecutiveActionAnchorProps) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm font-black text-nexus-white transition hover:border-[#2CC4E8]/25 hover:bg-white/[0.07]"
    >
      <span>{label}</span>
      <span>↓</span>
    </a>
  );
}