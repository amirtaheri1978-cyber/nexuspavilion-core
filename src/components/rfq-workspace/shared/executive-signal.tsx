type ExecutiveSignalProps = {
positive: boolean;
};

export function ExecutiveSignal({ positive }: ExecutiveSignalProps) {
return (
<span
className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black ${
positive ? "bg-emerald-400 text-slate-950" : "bg-orange-400 text-slate-950"
}`}
>
{positive ? "✓" : "!"}
</span>
);
}
