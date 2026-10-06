// Identifies a brand so a new report can be matched with an older one
export function brandKey(me) {
  try {
    if (me.website && me.website.url) {
      return new URL(me.website.url).hostname.replace(/^www\./, "");
    }
  } catch {}
  if (me.youtube && me.youtube.url) return me.youtube.url;
  return String(me.name || "").toLowerCase();
}

// Finds the closest older saved report for the same brand
// `reports` is the saved list, newest first
export function findPrevious(reports, current) {
  const index = reports.findIndex((r) => r.result.generated_at === current.generated_at);
  if (index === -1) return null;
  const key = brandKey(current.me);
  return reports.slice(index + 1).find((r) => brandKey(r.result.me) === key) || null;
}

// Differences in score between a report and an older one
export function scoreChanges(current, previous) {
  const rows = [];
  for (const [name, now] of Object.entries(current.me.scores)) {
    const before = previous.me.scores[name];
    if (typeof before === "number") rows.push({ name, now, before, delta: now - before });
  }
  return {
    overall: {
      now: current.me.overall,
      before: previous.me.overall,
      delta: current.me.overall - previous.me.overall,
    },
    rows,
    limited: Boolean(current.me.limited || previous.me.limited),
  };
}