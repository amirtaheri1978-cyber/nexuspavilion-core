type ExecutiveCommandStripCardProps = {
  title: string;
  value: string;
};

export function ExecutiveCommandStripCard({
  title,
  value,
}: ExecutiveCommandStripCardProps) {
  return (
    <div className="border-t border-white/10 p-5 md:border-r md:border-t-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}