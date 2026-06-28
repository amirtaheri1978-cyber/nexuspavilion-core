"use client";

import {
Bar,
BarChart,
CartesianGrid,
Cell,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

type AnalyticsChartProps = {
data: {
name: string;
value: number;
}[];
};

const BAR_COLORS = [
"#2CC4E8",
"#C8A646",
"#4ADE80",
"#60A5FA",
"#F59E0B",
"#A78BFA",
"#22D3EE",
"#EAB308",
];

export default function AnalyticsChart({
data,
}: AnalyticsChartProps) {
const safeData = data.map((item) => ({
name: item.name,
value: Number.isFinite(item.value) ? item.value : 0,
}));

return (
<div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#061426]/90 p-6 shadow-executive">
<div className="mb-6 flex items-center justify-between">
<div>
<p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
Executive Analytics
</p>

<h3 className="mt-2 text-2xl font-black text-white">
Procurement Intelligence
</h3>
</div>

<span className="rounded-full border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9BE8F8]">
Live
</span>
</div>

<ResponsiveContainer width="100%" height={360}>
<BarChart
data={safeData}
margin={{
top: 20,
right: 10,
left: -20,
bottom: 10,
}}
>
<CartesianGrid
stroke="#1E3348"
strokeDasharray="3 3"
vertical={false}
/>

<XAxis
dataKey="name"
tick={{
fill: "#94A3B8",
fontSize: 12,
fontWeight: 600,
}}
tickLine={false}
axisLine={false}
/>

<YAxis
allowDecimals={false}
tick={{
fill: "#94A3B8",
fontSize: 12,
fontWeight: 600,
}}
tickLine={false}
axisLine={false}
/>

<Tooltip
cursor={{
fill: "rgba(44,196,232,.06)",
}}
contentStyle={{
background: "#07111F",
border: "1px solid rgba(255,255,255,.08)",
borderRadius: "16px",
color: "white",
}}
labelStyle={{
color: "#C8A646",
fontWeight: 700,
}}
/>

<Bar
dataKey="value"
radius={[10, 10, 0, 0]}
>
{safeData.map((_, index) => (
<Cell
key={index}
fill={BAR_COLORS[index % BAR_COLORS.length]}
/>
))}
</Bar>
</BarChart>
</ResponsiveContainer>
</div>
);
}