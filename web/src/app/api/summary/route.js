import { aiSummary } from "@/lib/summary.mjs";
import { createLimiter, clientKey } from "@/lib/rateLimit.mjs";

export const maxDuration = 30;
// 6 AI summaries per visitor every 10 minutes (only enforced on the live site)
const summaryLimiter = createLimiter({ limit: 6, windowMs: 10 * 60 * 1000 });
const str = (v, n = 80) => String(v ?? "").slice(0, n);
const num = (v) => (Number.isFinite(v) ? v : 0);

export async function POST(req) {
  try {
    if (process.env.NODE_ENV === "production") {
      const gate = summaryLimiter(clientKey(req));
      if (!gate.ok) return Response.json({ text: null, source: "limited" }, { status: 429 });
    }

    const body = await req.json();
    const cmp = body && body.comparison;
    if (!body || !body.me || !cmp) return Response.json({ text: null, source: "none" });

    // Rebuild a small, clean object so only short text and numbers reach the AI
    const safe = {
      me: { name: str(body.me.name), overall: num(body.me.overall) },
      competitors: (body.competitors || []).slice(0, 5).map((c) => ({
        ok: Boolean(c.ok),
        name: str(c.name),
        overall: num(c.overall),
      })),
      comparison: {
        me_overall: num(cmp.me_overall),
                no_peers: Boolean(cmp.no_peers),
        competitor_overall: num(cmp.competitor_overall),
        rank: num(cmp.rank),
        total: num(cmp.total),
        dimensions: (cmp.dimensions || []).slice(0, 12).map((d) => ({
          name: str(d.name, 40),
          me: num(d.me),
          avg: num(d.avg),
        })),
        recommendations: (cmp.recommendations || []).slice(0, 10).map((r) => ({
          priority: str(r.priority, 10),
          area: str(r.area, 40),
        })),
        strengths: (cmp.strengths || []).slice(0, 5).map((s) => str(s, 120)),
      },
    };

    const text = await aiSummary(safe);
    return Response.json(text ? { text, source: "ai" } : { text: null, source: "none" });
  } catch {
    return Response.json({ text: null, source: "none" });
  }
}