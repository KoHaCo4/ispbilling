"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type RevenueDataPoint = {
  month: string;
  revenue: number;
};

export default function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#7C918633"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#7C9186" }}
          axisLine={{ stroke: "#7C918633" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#7C9186" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            value >= 1000000
              ? `${(value / 1000000).toFixed(1)}jt`
              : `${value / 1000}rb`
          }
        />
        <Tooltip
          formatter={(value) => [
            `Rp${Number(value).toLocaleString("id-ID")}`,
            "Pendapatan",
          ]}
          contentStyle={{
            backgroundColor: "#16231F",
            border: "none",
            borderRadius: 0,
            fontSize: 12,
            color: "#F7F5F0",
          }}
          labelStyle={{ color: "#F7F5F0" }}
          cursor={{ fill: "#7C918615" }}
        />
        <Bar dataKey="revenue" fill="#E8A33D" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
