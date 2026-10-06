"use client";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import RainOverlay from "@/components/RainOverlay";
import ScoreChart from "@/components/ScoreChart";
import BrandCard from "@/components/BrandCard";
import ComparisonTable from "@/components/ComparisonTable";
import ProgressCard from "@/components/ProgressCard";
import { findPrevious, scoreChanges } from "@/lib/progress.mjs";
import { loadReports, saveReport, deleteReport, clearReports } from "@/lib/history";

const SOCIAL_FIELDS = [
  ["youtube", "YouTube channel"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["twitter", "X (Twitter)"],
  ["linkedin", "LinkedIn"],
  ["tiktok", "TikTok"],
];

const emptyBrand = () => ({
  name: "",
  website: "",
  youtube: "",
  instagram: "",
  facebook: "",
  twitter: "",
  linkedin: "",
  tiktok: "",
});

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur transition duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-white/5";

function BrandFields({ value, onChange, namePlaceholder }) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  const socialCount = SOCIAL_FIELDS.filter(([key]) => value[key].trim()).length;

  return (
    <div className="space-y-3">
      <input
        className={inputClass}
        placeholder={namePlaceholder}
        value={value.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Website link (https://...)"
        value={value.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <details className="group rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10">
        <summary className="cursor-pointer select-none text-sm font-medium text-cyan-600 dark:text-cyan-300">
          Social channels (optional){socialCount > 0 ? ` · ${socialCount} added` : ""}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map(([key, label]) => (
            <input
              key={key}
              className={inputClass}
              placeholder={`${label} link`}
              value={value[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}

const priorityStyle = {
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  low: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
};

export default function Home() {
  const [me, setMe] = useState(emptyBrand());
  const [competitors, setCompetitors] = useState([emptyBrand(), emptyBrand()]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Load saved reports once, after the page opens
  useEffect(() => {
    const id = setTimeout(() => setSaved(loadReports()), 0);
    return () => clearTimeout(id);
  }, []);
  const setCompetitor = (index, value) =>
    setCompetitors((list) => list.map((c, i) => (i === index ? value : c)));
  const addCompetitor = () =>
    setCompetitors((list) => (list.length < 4 ? [...list, emptyBrand()] : list));
  const removeCompetitor = (index) =>
    setCompetitors((list) => (list.length > 1 ? list.filter((_, i) => i !== index) : list));

   const analyze = async (payload) => {
    const input = payload || { me, competitors };
    setError("");
    setAnalyzing(true);
    const minimumTime = new Promise((r) => setTimeout(r, 2500)); // so the rain is always visible
    try {
      const [res] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
        }),
        minimumTime,
      ]);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setResult(null);
      } else {
                        setResult(data);
        setSaved(saveReport(data));

        // Ask for the AI summary in the background; the report is already visible
        setAiLoading(true);
        fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
          .then((r) => r.json())
          .then((s) => {
            if (s.text) setAi({ for: data.generated_at, text: s.text });
          })
          .catch(() => {})
          .finally(() => setAiLoading(false));
        setTimeout(() => {
          const el = document.getElementById("report");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setAnalyzing(false);
  };

  const exportPdf = () => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    // The PDF is always printed in light colors
    root.classList.remove("dark");
    window.addEventListener(
      "afterprint",
      () => {
        if (wasDark) root.classList.add("dark");
      },
      { once: true }
    );
    window.print();
  };
    const runExample = () => {
    const exMe = { ...emptyBrand(), name: "Shopify", website: "https://www.shopify.com" };
    const exCompetitors = [
      { ...emptyBrand(), name: "BigCommerce", website: "https://www.bigcommerce.com" },
      { ...emptyBrand(), name: "Squarespace", website: "https://www.squarespace.com" },
    ];
    setMe(exMe);
    setCompetitors(exCompetitors);
    analyze({ me: exMe, competitors: exCompetitors });
  };
  const cmp = result ? result.comparison : null;
  const previous = result ? findPrevious(saved, result) : null;
  const changes = previous ? scoreChanges(result, previous.result) : null;
    const aiShown = Boolean(ai && result && ai.for === result.generated_at);
  const summaryText = aiShown ? ai.text : result && result.summary ? result.summary.text : "";

  return (
    <main className="min-h-screen">
      <RainOverlay active={analyzing} />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Automated Competitor Monitoring Dashboard</span>
          <ThemeToggle />
        </header>

        <section className="mt-14 text-center">
          <h1 className=" shimmer-text bg-gradient-to-r from-cyan-500 to-indigo-500 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            See how you compare
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
            Add your website and social channels, then your competitors. Every field except one
            link is optional. The more you add, the better the comparison.
          </p>
        </section>

        <section className={`mt-10 ${cardClass}`}>
          <h2 className="text-lg font-semibold">You</h2>
          <div className="mt-3">
            <BrandFields value={me} onChange={setMe} namePlaceholder="Your brand name (optional)" />
          </div>
        </section>

        <section className="mt-6 space-y-6">
          {competitors.map((c, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Competitor {i + 1}</h2>
                {competitors.length > 1 && (
                  <button
                    onClick={() => removeCompetitor(i)}
                    aria-label="Remove competitor"
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-500 transition hover:border-rose-400 hover:text-rose-500 dark:border-white/10"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-3">
                <BrandFields
                  value={c}
                  onChange={(v) => setCompetitor(i, v)}
                  namePlaceholder="Competitor name (optional)"
                />
              </div>
            </div>
          ))}
        </section>

        {error && (
          <p className="mt-6 rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {competitors.length < 4 ? (
            <button
              onClick={addCompetitor}
              className="text-sm font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
            >
              + Add another competitor
            </button>
          ) : (
            <span />
          )}
                    <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runExample}
              disabled={analyzing}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:border-cyan-500 hover:text-cyan-600 disabled:opacity-50 dark:border-white/10 dark:hover:text-cyan-300"
            >
              Try an example
            </button>
            <button
              onClick={() => analyze()}
              disabled={analyzing}
              className="btn-glow rounded-xl px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
        {saved.length > 0 && (
          <section className={`mt-10 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Past reports</h2>
              <button
                onClick={() => setSaved(clearReports())}
                className="text-sm text-slate-500 hover:text-rose-500"
              >
                Clear all
              </button>
            </div>
            <ul className="mt-3 divide-y divide-slate-200 dark:divide-white/10">
              {saved.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <button
                    onClick={() => {
                      setResult(r.result);
                      setTimeout(() => {
                        const el = document.getElementById("report");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="min-w-0 text-left hover:text-cyan-600 dark:hover:text-cyan-300"
                  >
                    <span className="block truncate font-medium">{r.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Score {r.score} · {new Date(r.saved_at).toLocaleString()}
                    </span>
                  </button>
                  <button
                    onClick={() => setSaved(deleteReport(r.id))}
                    aria-label="Delete report"
                    className="shrink-0 text-slate-400 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {result && (
                   <section id="report" className="fade-up mt-14 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Your report</h2>
              <button
                onClick={exportPdf}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-cyan-500 hover:text-cyan-600 print:hidden dark:border-white/10 dark:hover:text-cyan-300"
              >
                Export PDF
              </button>
            </div>
                        {summaryText && (
              <div className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Summary</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      aiShown
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {aiShown ? "AI-written" : aiLoading ? "Rule-based · AI loading…" : "Rule-based · AI unavailable right now"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{summaryText}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className={cardClass}>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your score</p>
                <p className="mt-1 text-4xl font-bold">{result.me.overall}</p>
              </div>
              <div className={cardClass}>
                <p className="text-sm text-slate-500 dark:text-slate-400">Competitor average</p>
                             <p className="mt-1 text-4xl font-bold">
                  {cmp && !cmp.no_peers ? cmp.competitor_overall : "-"}
                </p>
              </div>
              <div className={cardClass}>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your rank</p>
                <p className="mt-1 text-4xl font-bold">
                                  {cmp && !cmp.no_peers ? `${cmp.rank} of ${cmp.total}` : "-"}
                </p>
              </div>
            </div>
              {cmp && cmp.dimensions.length > 0 && (
              <div className={cardClass}>
                <h3 className="font-semibold">You vs competitors</h3>
                <div className="mt-4">
                  <ScoreChart dimensions={cmp.dimensions} />
                </div>
              </div>
            )}
                        {cmp && cmp.notes && cmp.notes.length > 0 && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold">Data quality notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {cmp.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
                        {changes && <ProgressCard changes={changes} previousDate={previous.saved_at} />}
                        <ComparisonTable brands={[result.me, ...result.competitors]} />
                        <div className="grid gap-4 md:grid-cols-2">
              <BrandCard brand={result.me} isMe />
              {result.competitors.map((c, i) => (
                <BrandCard key={i} brand={c} />
              ))}
            </div>
            {cmp && !cmp.no_peers && (
              <div className={cardClass}>
                <h3 className="font-semibold">Recommendations</h3>
                {cmp.recommendations.length === 0 && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No major gaps found. Nice work.
                  </p>
                )}
                <ul className="mt-3 space-y-3">
                  {cmp.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span
                        className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${priorityStyle[r.priority]}`}
                      >
                        {r.priority}
                      </span>
                      <span>
                        <strong>{r.area}:</strong> {r.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {cmp && cmp.strengths.length > 0 && (
              <div className={cardClass}>
                <h3 className="font-semibold">Your strengths</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {cmp.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.competitors.some((c) => !c.ok) && (
              <p className="text-sm text-amber-600 dark:text-amber-300">
                Some competitors could not be read:{" "}
                {result.competitors
                  .filter((c) => !c.ok)
                  .map((c) => `${c.name} (${c.error})`)
                  .join("; ")}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}