type ExecutiveMiniTileProps = {
title: string;
value: string;
detail?: string;
};

export function ExecutiveMiniTile({
title,
value,
detail,
}: ExecutiveMiniTileProps) {
return (
<div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-2xl font-black text-white">{value}</p>

{detail ? (
<p className="mt-2 text-xs font-bold leading-5 text-slate-400">
{detail}
</p>
) : null}
</div>
);
}