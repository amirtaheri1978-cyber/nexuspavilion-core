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
return (
<div className="h-80 w-full">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={data}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="name" />
<YAxis />
<Tooltip />
<Bar dataKey="value" />
</BarChart>
</ResponsiveContainer>
</div>
);
}