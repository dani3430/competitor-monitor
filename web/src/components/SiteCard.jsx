import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

export default function SiteCard({ site, history }) {
  const data = history.slice(-30).map((h, i) => ({ i, ms: h.response_ms ?? 0 }));
  const up = site.up;

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{site.name}</h3>
          <a
            href={site.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-slate-400 hover:text-cyan-300"
          >
            {site.url}
          </a>
        </div>
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            up ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${up ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
          {up ? "UP" : "DOWN"}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-300">
        {site.title || site.error || "No title"}
      </p>

      {site.changed && (
        <div className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300">
          ⚠ Page content changed since last check
        </div>
      )}

      <div className="mt-4 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v} ms`, "Response"]}
              labelFormatter={() => ""}
            />
            <Line type="monotone" dataKey="ms" stroke="#22d3ee" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>{site.response_ms ?? "-"} ms</span>
        <span>{site.checked_at ? new Date(site.checked_at).toLocaleString() : ""}</span>
      </div>
    </div>
  );
}