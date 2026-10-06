function Flag({ yes }) {
  return yes ? (
    <span className="font-medium text-emerald-600 dark:text-emerald-400">Yes</span>
  ) : (
    <span className="text-slate-400">No</span>
  );
}

function priceRange(w) {
  if (!w) return "-";
  const p = w.pricing;
  if (!p.found) return "Not found";
  const c = p.currency ? (p.currency.length > 1 ? `${p.currency} ` : p.currency) : "";
  return p.max !== p.min ? `${c}${p.min} – ${c}${p.max}` : `${c}${p.min}`;
}

function cut(text, n) {
  if (!text) return "-";
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

const ROWS = [
  ["Overall score", (b) => <span className="text-base font-bold">{b.overall}</span>],
  ["Price range", (b) => priceRange(b.website)],
  ["Business model", (b) => (b.website ? b.website.pricing.model : "-")],
  [
    "Free trial or plan",
    (b) => {
      if (!b.website) return "-";
      const p = b.website.pricing;
      const parts = [p.free_trial && "Free trial", p.free_plan && "Free plan"].filter(Boolean);
      return parts.length ? parts.join(", ") : "No";
    },
  ],
  [
    "Promotions",
    (b) => (b.website ? (b.website.promos.length ? b.website.promos.join(", ") : "None detected") : "-"),
  ],
  [
    "Main calls to action",
    (b) => (b.website && b.website.ctas.length ? b.website.ctas.slice(0, 3).join(", ") : "-"),
  ],
  ["Main headline", (b) => (b.website ? cut(b.website.h1, 90) : "-")],
  ["Has a blog", (b) => (b.website ? <Flag yes={b.website.has_blog} /> : "-")],
  ["Testimonials or trust signals", (b) => (b.website ? <Flag yes={b.website.has_trust} /> : "-")],
  ["Response time", (b) => (b.website ? `${b.website.response_ms} ms` : "-")],
  [
    "YouTube",
    (b) => (b.youtube ? `${b.youtube.avg_views.toLocaleString()} avg views` : "-"),
  ],
  [
    "Channels",
    (b) => (Object.keys(b.socials || {}).length ? Object.keys(b.socials).join(", ") : "None found"),
  ],
];

export default function ComparisonTable({ brands }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <h3 className="font-semibold">Side by side</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-3 dark:bg-slate-900" />
              {brands.map((b, i) => (
                <th
                  key={i}
                  className="p-3 align-bottom font-semibold text-slate-900 dark:text-slate-100"
                >
                  {b.name}
                  {i === 0 && <span className="ml-1 text-xs font-normal text-cyan-600">(you)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, render]) => (
              <tr key={label} className="border-t border-slate-200 dark:border-white/10">
                <th className="sticky left-0 bg-white p-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  {label}
                </th>
                {brands.map((b, i) => (
                  <td key={i} className="p-3 align-top text-slate-700 dark:text-slate-300">
                    {b.ok ? render(b) : <span className="text-rose-500">Could not be read</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}