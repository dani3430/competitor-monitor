export const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function extractPrices(text) {
  const re = /(?:[$€£]|USD\s?|EUR\s?|ETB\s?|Birr\s?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/gi;
  const values = [];
  let currency = null;
  let m;
  while ((m = re.exec(text)) && values.length < 60) {
    const v = parseFloat(m[1].replace(/,/g, "") + (m[2] ? "." + m[2] : ""));
    if (v > 0 && v < 100000) {
      values.push(v);
      if (!currency) currency = m[0].match(/^[^\d]+/)[0].trim();
    }
  }
  return { values, currency };
}

export function speedScore(ms) {
  if (ms < 400) return 100;
  if (ms < 800) return 80;
  if (ms < 1500) return 60;
  if (ms < 3000) return 40;
  return 20;
}

export function websiteScores(s) {
  const pricing =
    (s.pricing.found ? 60 : 0) +
    (s.pricingUrl ? 25 : 0) +
    (s.pricing.free_trial || s.pricing.free_plan ? 15 : 0);

  const promotion = s.promos.length * 25 + (s.promos.includes("Percent discount") ? 15 : 0);

  const content =
    (s.hasBlog ? 35 : 0) + (s.hasTrust ? 25 : 0) + (s.headingsCount >= 4 ? 20 : 0) + (s.schema ? 20 : 0);

  const social = (s.socialCount / 5) * 100;

  const seo =
    (s.url.startsWith("https") ? 20 : 0) +
    (s.title.length >= 30 && s.title.length <= 65 ? 20 : s.title ? 10 : 0) +
    (s.description.length >= 70 && s.description.length <= 160 ? 20 : s.description ? 10 : 0) +
    (s.image ? 20 : 0) +
    (s.h1Count === 1 ? 20 : s.h1Count > 1 ? 10 : 0);

  return {
    "Pricing transparency": clamp(pricing),
    Promotion: clamp(promotion),
    "Content & trust": clamp(content),
    "Social presence": clamp(social),
    "SEO basics": clamp(seo),
    Speed: speedScore(s.ms),
  };
}

export const TIPS = {
  "Pricing transparency":
    "Publish clear prices on a dedicated /pricing page and offer a free trial or an entry-level plan.",
  Promotion:
    "Run visible promotions such as a launch discount, a free trial banner or a money-back guarantee.",
  "Content & trust":
    "Add a blog, customer testimonials or case studies, and structured data to build trust and search traffic.",
  "Social presence":
    "Link your active social channels from the homepage; competitors use them to build audience.",
  "SEO basics":
    "Fix your title (30-65 characters), meta description (70-160), add one H1 and a preview image.",
  Speed: "Speed up your site: compress images, enable caching and reduce scripts.",
  Activity: "Upload at least once a week; recent activity keeps the channel in viewers' feeds.",
  Reach: "Improve titles and thumbnails; your average views per video are lower than competitors'.",
  Consistency: "Publish on a fixed schedule, for example 1-2 videos per week.",
};

export function compare(me, others) {
  const peers = others.filter((o) => o.ok);
  if (!peers.length) return null;

  const dimensions = Object.keys(me.scores)
    .map((name) => {
      const vals = peers.map((p) => p.scores[name]).filter((v) => typeof v === "number");
      if (!vals.length) return null;
      return { name, me: me.scores[name], avg: clamp(avg(vals)), best: Math.max(...vals) };
    })
    .filter(Boolean);

  const recs = [];
  const strengths = [];

  for (const d of dimensions) {
    const gap = d.avg - d.me;
    if (gap >= 10) {
      recs.push({
        priority: gap >= 25 ? "high" : "medium",
        area: d.name,
        text: `${TIPS[d.name] || "Improve this area."} (You: ${d.me}, competitors: ${d.avg}.)`,
      });
    } else if (d.me - d.avg >= 10) {
      strengths.push(`${d.name}: you score ${d.me} vs ${d.avg} for competitors.`);
    }
  }

  const myChannels = new Set([...Object.keys(me.socials), ...(me.website ? ["website"] : [])]);
  const theirChannels = new Set(
    peers.flatMap((p) => [...Object.keys(p.socials), ...(p.website ? ["website"] : [])])
  );
  const missingChannels = [...theirChannels].filter((c) => !myChannels.has(c));
  if (missingChannels.length) {
    recs.push({
      priority:
        missingChannels.includes("youtube") || missingChannels.includes("website") ? "medium" : "low",
      area: "Channels",
      text: `Competitors are present on ${missingChannels.join(", ")}, where you have no link.`,
    });
  }

  const myWeb = me.website;
  const peerWebs = peers.map((p) => p.website).filter(Boolean);

  if (myWeb && peerWebs.length) {
    const theirMin = median(peerWebs.map((w) => w.pricing.min).filter(Boolean));
    if (myWeb.pricing.min && theirMin) {
      const diff = ((myWeb.pricing.min - theirMin) / theirMin) * 100;
      if (diff > 15) {
        recs.push({
          priority: "medium",
          area: "Pricing",
          text: `Your entry price is about ${Math.round(diff)}% above the competitor median. Justify it with clearer value, or add a lower entry tier.`,
        });
      } else if (diff < -15) {
        recs.push({
          priority: "low",
          area: "Pricing",
          text: `Your entry price is about ${Math.round(-diff)}% below the competitor median. You may have room to raise it, or you can market the lower price.`,
        });
      }
    } else if (!myWeb.pricing.found && theirMin) {
      recs.push({
        priority: "high",
        area: "Pricing",
        text: "No prices found on your site, but competitors show theirs. Visitors compare, so show your pricing.",
      });
    }

    const theirPromos = new Set(peerWebs.flatMap((w) => w.promos));
    const missingPromos = [...theirPromos].filter((p) => !myWeb.promos.includes(p));
    if (missingPromos.length) {
      recs.push({
        priority: "medium",
        area: "Promotion",
        text: `Competitors use: ${missingPromos.join(", ")}. Consider testing one of these.`,
      });
    }

    const models = [...new Set(peerWebs.map((w) => w.pricing.model).filter((m) => m !== "Unknown"))];
    if (models.length) {
      recs.push({
        priority: "low",
        area: "Strategy",
        text: `Competitor business models: ${models.join(", ")}. Your model: ${myWeb.pricing.model}.`,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => order[a.priority] - order[b.priority]);

  const all = [me, ...peers].sort((a, b) => b.overall - a.overall);
  return {
    dimensions,
    rank: all.indexOf(me) + 1,
    total: all.length,
    me_overall: me.overall,
    competitor_overall: clamp(avg(peers.map((p) => p.overall))),
    strengths,
    recommendations: recs,
  };
}