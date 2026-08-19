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
      <p className="np-type-meta">
        {title}
      </p>

      <p className="np-type-kpi mt-2 text-lg text-white">{value}</p>
    </div>
  );
}