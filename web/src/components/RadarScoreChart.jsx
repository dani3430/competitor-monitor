"use client";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RadarScoreChart({ dimensions }) {
  // A radar needs at least 3 axes to form a shape
  if (!dimensions || dimensions.length < 3) return null;

  const data = dimensions.map((d) => ({
    area: d.name,
    You: d.me,
    "Competitor average": d.avg,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#94a3b8" strokeOpacity={0.35} />
          <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: "#94a3b8" }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
          />
          <Radar
            name="Competitor average"
            dataKey="Competitor average"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="You"
            dataKey="You"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
              color: "#f1f5f9",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}