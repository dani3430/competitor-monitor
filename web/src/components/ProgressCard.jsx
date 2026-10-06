function Delta({ value }) {
  if (value === 0) return <span className="text-slate-400">no change</span>;
  const up = value > 0;
  return (
    <span
      className={`font-semibold ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? "▲ +" : "▼ "}
      {value}
    </span>
  );
}

export default function ProgressCard({ changes, previousDate }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Progress since your last report</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Compared with {new Date(previousDate).toLocaleString()}
        </span>
      </div>

      <p className="mt-3 text-sm">
        Overall score: {changes.overall.before} → <strong>{changes.overall.now}</strong>{" "}
        <Delta value={changes.overall.delta} />
      </p>

      <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {changes.rows.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between border-b border-slate-200 py-1 dark:border-white/10"
          >
            <span>{r.name}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {r.before} → {r.now} <Delta value={r.delta} />
            </span>
          </li>
        ))}
      </ul>

      {changes.limited && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          One of these reports had limited data, so some changes may come from what the site
          allowed us to read, not from real improvements.
        </p>
      )}
    </div>
  );
}