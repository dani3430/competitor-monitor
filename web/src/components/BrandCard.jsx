import ScoreRing from "@/components/ScoreRing";
function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-t border-slate-200 py-3 first:border-t-0 dark:border-white/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function BrandCard({ brand, isMe }) {
  if (!brand.ok) {
    return (
      <div className="rounded-2xl border border-rose-300/40 bg-rose-500/5 p-5">
        <h3 className="font-semibold">{brand.name}</h3>
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
          Could not be read: {brand.error}
        </p>
      </div>
    );
  }

  const w = brand.website;
  const y = brand.youtube;
  const p = w ? w.pricing : null;
  const socials = Object.keys(brand.socials || {});

  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur transition hover:-translate-y-1 hover:shadow-lg ${
        isMe
          ? "border-cyan-400/60 bg-cyan-500/5"
          : "border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">
            {brand.name} {isMe && <span className="text-xs font-normal text-cyan-600">(you)</span>}
          </h3>
          {w && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{w.title}</p>}
        </div>
               <ScoreRing score={brand.overall} />
      </div>
            {brand.limited && (
        <div className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          ⚠ Limited data: {w && w.quality ? w.quality.reason : "Very little readable content was found."}
        </div>
      )}

      <div className="mt-3">
        {w && (
          <Row label="Pricing">
            {p.found ? (
              <span>
                {p.currency || ""}
                {p.min}
                {p.max !== p.min ? ` – ${p.currency || ""}${p.max}` : ""} · {p.model}
              </span>
            ) : (
              <span className="text-slate-500">No prices found</span>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {p.free_trial && <Chip tone="cyan">Free trial</Chip>}
              {p.free_plan && <Chip tone="cyan">Free plan</Chip>}
            </div>
          </Row>
        )}

        {w && (
          <Row label="Promotions">
            {w.promos.length ? (
              <div className="flex flex-wrap gap-2">
                {w.promos.map((x) => (
                  <Chip key={x} tone="amber">{x}</Chip>
                ))}
              </div>
            ) : (
              <span className="text-slate-500">None detected</span>
            )}
          </Row>
        )}

        {w && w.ctas.length > 0 && (
          <Row label="Main calls to action">
            <div className="flex flex-wrap gap-2">
              {w.ctas.map((x) => (
                <Chip key={x}>{x}</Chip>
              ))}
            </div>
          </Row>
        )}

        {y && (
          <Row label="YouTube">
            {y.title} · avg {y.avg_views.toLocaleString()} views · {y.uploads_last_30_days} uploads
            in 30 days
          </Row>
        )}

        <Row label="Channels">
          {socials.length ? (
            <div className="flex flex-wrap gap-2">
              {socials.map((s) => (
                <Chip key={s} tone="cyan">{s}</Chip>
              ))}
            </div>
          ) : (
            <span className="text-slate-500">None found</span>
          )}
        </Row>

        {brand.errors && brand.errors.length > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
            {brand.errors.join("; ")}
          </p>
        )}
      </div>
    </div>
  );
}