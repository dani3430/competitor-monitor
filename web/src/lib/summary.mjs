// Plain-text summary built from rules. Always works, needs no key.
export function ruleSummary(result) {
  const me = result.me;
  const cmp = result.comparison;
  if (!cmp) {
    return `${me.name} scored ${me.overall}/100. No competitor could be read, so there is nothing to compare yet.`;
  }

  const position =
    cmp.rank === 1
      ? "ahead of every competitor"
      : cmp.rank === cmp.total
      ? "behind every competitor"
      : `ranked ${cmp.rank} of ${cmp.total}`;

  const parts = [
    `${me.name} scored ${cmp.me_overall}/100 against a competitor average of ${cmp.competitor_overall}, ${position}.`,
  ];

  const top = cmp.recommendations.filter((r) => r.priority !== "low").slice(0, 2);
  if (top.length) {
    parts.push(`Biggest opportunities: ${top.map((r) => r.area).join(" and ")}.`);
  } else {
    parts.push("No major gaps were found.");
  }

  if (cmp.strengths.length) {
    parts.push(`Strongest area: ${cmp.strengths[0].split(":")[0]}.`);
  }
  return parts.join(" ");
}

// Short summary written by the free Gemini tier. Returns null on any problem.
export async function aiSummary(result, env = process.env) {
  const key = env.GEMINI_API_KEY;
  const cmp = result.comparison;
    if (!key || !cmp) return null;

  // Only compact facts are sent, never raw page content
  const facts = {
    brand: result.me.name,
    your_score: cmp.me_overall,
    competitor_average: cmp.competitor_overall,
    rank: `${cmp.rank} of ${cmp.total}`,
    competitors: result.competitors.filter((c) => c.ok).map((c) => ({ name: c.name, score: c.overall })),
    dimensions: cmp.dimensions.map((d) => ({ area: d.name, you: d.me, competitors: d.avg })),
    recommendations: cmp.recommendations.slice(0, 5).map((r) => `${r.priority}: ${r.area}`),
    strengths: cmp.strengths.slice(0, 3),
  };

  const prompt =
    "You are a business analyst. Write a summary of 3 to 4 sentences, in plain English, " +
    "for a small business owner, from these competitor comparison results. " +
    "Say where they stand, their biggest weakness and strength, and the first action to take. " +
        "Use only the facts given. Do not invent numbers. No bullet points, no markdown. " +
    "If the recommendations list is empty, say that no major gaps were found. " +
    "Never mention missing, empty or unavailable data.\n\n" +
    JSON.stringify(facts);

    const model = env.GEMINI_MODEL || "gemini-3.8-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const deadline = Date.now() + 14000; // never wait more than about 14 seconds in total

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 3000) break;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(Math.min(9000, remaining)),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ? text.trim() : null;
      }
      // Only a busy server (503) is worth retrying
      if (res.status !== 503) return null;
    } catch {
      // timeout or network error: try once more if time is left
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}