"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ScoreChart({ dimensions }) {
  if (!dimensions || dimensions.length === 0) return null;

  const data = dimensions.map((d) => ({
    name: d.name,
    You: d.me,
    "Competitor average": d.avg,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
              color: "#f1f5f9",
            }}
            cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="You" fill="#06b6d4" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Competitor average" fill="#6366f1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}