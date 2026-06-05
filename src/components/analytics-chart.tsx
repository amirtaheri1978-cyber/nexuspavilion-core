"use client";

import {
Bar,
BarChart,
CartesianGrid,
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

export default function AnalyticsChart({ data }: AnalyticsChartProps) {
const safeData = data.map((item) => ({
name: item.name,
value: Number.isFinite(item.value) ? item.value : 0,
}));

return (
<div className="min-w-0 rounded-3xl bg-slate-50 p-4">
<ResponsiveContainer width="100%" height={320}>
<BarChart data={safeData}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="name" />
<YAxis allowDecimals={false} />
<Tooltip />
<Bar dataKey="value" />
</BarChart>
</ResponsiveContainer>
</div>
);
}