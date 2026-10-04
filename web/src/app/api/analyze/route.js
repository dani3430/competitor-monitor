import * as cheerio from "cheerio";

export const maxDuration = 30;

const UA = { "User-Agent": "Mozilla/5.0 (compatible; CompetitorMonitor/1.0)" };

// Blocks private addresses so nobody can use your server to probe internal networks
const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1)/;

function normalize(input) {
  let u = String(input || "").trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (BLOCKED.test(parsed.hostname)) throw new Error("This address is not allowed");
  return parsed;
}

async function getHtml(url) {
  const start = Date.now();
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (BLOCKED.test(new URL(res.url).hostname)) throw new Error("This address is not allowed");
  const html = (await res.text()).slice(0, 1_500_000);
  return { res, html, ms: Date.now() - start };
}

const SOCIALS = {
  youtube: /youtube\.com|youtu\.be/,
  instagram: /instagram\.com/,
  facebook: /facebook\.com/,
  twitter: /twitter\.com|x\.com/,
  linkedin: /linkedin\.com/,
  tiktok: /tiktok\.com/,
};

const SOCIAL_HOSTS = {
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
  facebook: /(^|\.)(facebook\.com|fb\.com)$/,
  twitter: /(^|\.)(twitter\.com|x\.com)$/,
  linkedin: /(^|\.)linkedin\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
};

const PROMO_RULES = [
  ["Percent discount", /(\d{1,2})\s?%\s?(off|discount)|save\s+(up to\s+)?\d{1,2}\s?%/i],
  ["Free trial", /free trial|try (it )?for free|try free|start free/i],
  ["Money-back guarantee", /money[- ]back|refund guarantee/i],
  ["Limited-time offer", /limited[- ]time|ends (soon|today)|today only|flash sale|black friday|cyber monday/i],
  ["Free shipping", /free (shipping|delivery)/i],
  ["Promo code", /promo code|coupon|use code/i],
  ["Bundle / special deal", /bundle|buy one|special offer/i],
];

const CTA_RE =
  /get started|sign up|start free|try for free|buy now|book a demo|request a demo|contact sales|shop now|subscribe|add to cart|join/i;

const TIPS = {
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

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function extractPrices(text) {
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

function pageText($) {
  $("script, style, noscript").remove();
  return $("body").text().replace(/\s+/g, " ");
}

/* ---------- WEBSITE ---------- */
async function analyzeWebsite(parsed) {
  const { res, html, ms } = await getHtml(parsed.href);
  const $ = cheerio.load(html);
  const meta = (n) =>
    $(`meta[name="${n}"]`).attr("content") || $(`meta[property="${n}"]`).attr("content") || "";

  const socials = {};
  const ctas = new Set();
  let pricingUrl = null;
  let hasBlog = false;

  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || "";
    const text = $(a).text().trim();
    for (const [name, re] of Object.entries(SOCIALS)) {
      if (!socials[name] && /^https?:/.test(href) && re.test(href)) socials[name] = href;
    }
    if (!pricingUrl && /pricing|plans|price/i.test(text + " " + href)) {
      try {
        const u = new URL(href, res.url);
        if (u.hostname === new URL(res.url).hostname) pricingUrl = u.href;
      } catch {}
    }
    if (/blog|news|articles|resources/i.test(text + " " + href)) hasBlog = true;
  });

  $("a, button").each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length < 40 && CTA_RE.test(t) && ctas.size < 5) ctas.add(t);
  });

  const headings = $("h1, h2")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 8);
  const h1Count = $("h1").length;
  const h1 = $("h1").first().text().trim();
  const schema = $('script[type="application/ld+json"]').length > 0;
  const title = $("title").first().text().trim();
  const description = meta("description") || meta("og:description");
  const image = meta("og:image");
  const text = pageText($);

  let { values, currency } = extractPrices(text);
  let pricingText = text;
  if (pricingUrl && pricingUrl !== res.url) {
    try {
      const p = await getHtml(pricingUrl);
      const $p = cheerio.load(p.html);
      pricingText = pageText($p);
      const more = extractPrices(pricingText);
      if (more.values.length) {
        values = more.values;
        currency = more.currency || currency;
      }
    } catch {}
  }

  const promos = PROMO_RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
  const model = /add to cart|shopping cart/i.test(text)
    ? "E-commerce"
    : /per month|\/mo\b|monthly|annually|per user/i.test(pricingText)
    ? "Subscription"
    : values.length
    ? "One-time / fixed price"
    : "Unknown";

  const pricing = {
    found: values.length > 0,
    page: pricingUrl,
    currency,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    free_trial: /free trial|try (it )?for free|try free/i.test(pricingText),
    free_plan: /free plan|free forever|\$0|freemium/i.test(pricingText),
    model,
  };

  const hasTrust = /testimonial|trusted by|customers love|reviews|rated|case stud/i.test(text);

  const profile = {
    type: "website",
    url: res.url,
    status: res.status,
    up: res.status < 400,
    response_ms: ms,
    title,
    description,
    image,
    h1,
    headings,
    ctas: [...ctas],
    pricing,
    promos,
    has_blog: hasBlog,
    has_trust: hasTrust,
    has_schema: schema,
    socials,
    checked_at: new Date().toISOString(),
  };

  const pricingScore =
    (pricing.found ? 60 : 0) +
    (pricingUrl ? 25 : 0) +
    (pricing.free_trial || pricing.free_plan ? 15 : 0);

  const promoScore = promos.length * 25 + (promos.includes("Percent discount") ? 15 : 0);

  const contentScore =
    (hasBlog ? 35 : 0) + (hasTrust ? 25 : 0) + (headings.length >= 4 ? 20 : 0) + (schema ? 20 : 0);

  const socialScore = (Object.keys(socials).length / 5) * 100;

  const seoScore =
    (res.url.startsWith("https") ? 20 : 0) +
    (title.length >= 30 && title.length <= 65 ? 20 : title ? 10 : 0) +
    (description.length >= 70 && description.length <= 160 ? 20 : description ? 10 : 0) +
    (image ? 20 : 0) +
    (h1Count === 1 ? 20 : h1Count > 1 ? 10 : 0);

  let speedScore = 20;
  if (ms < 400) speedScore = 100;
  else if (ms < 800) speedScore = 80;
  else if (ms < 1500) speedScore = 60;
  else if (ms < 3000) speedScore = 40;

  profile.scores = {
    "Pricing transparency": clamp(pricingScore),
    Promotion: clamp(promoScore),
    "Content & trust": clamp(contentScore),
    "Social presence": clamp(socialScore),
    "SEO basics": clamp(seoScore),
    Speed: speedScore,
  };

  return profile;
}

/* ---------- YOUTUBE ---------- */
async function analyzeYouTube(parsed) {
  let channelId = parsed.pathname.match(/\/channel\/(UC[\w-]{22})/)?.[1];

  if (!channelId) {
    const { html } = await getHtml(parsed.href);
    channelId =
      html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ||
      html.match(/channel\/(UC[\w-]{22})/)?.[1];
  }
  if (!channelId) throw new Error("Could not find that YouTube channel");

  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    { headers: UA, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error("YouTube feed unavailable");
  const $ = cheerio.load(await res.text(), { xmlMode: true });

  const videos = $("entry")
    .map((_, e) => {
      const entry = $(e);
      return {
        title: entry.find("title").first().text(),
        url: entry.find("link").attr("href"),
        published: entry.find("published").text(),
        views: Number(entry.find("media\\:statistics").attr("views") || 0),
        thumbnail: entry.find("media\\:thumbnail").attr("url"),
      };
    })
    .get();

  const avgViews = Math.round(avg(videos.map((v) => v.views)));
  const lastUpload = videos[0] ? videos[0].published : null;
  const daysSince = lastUpload ? (Date.now() - new Date(lastUpload).getTime()) / 86400000 : 999;
  const last30 = videos.filter(
    (v) => (Date.now() - new Date(v.published).getTime()) / 86400000 <= 30
  ).length;

  let activityScore = 10;
  if (daysSince <= 7) activityScore = 100;
  else if (daysSince <= 30) activityScore = 75;
  else if (daysSince <= 90) activityScore = 40;

  return {
    type: "youtube",
    url: `https://www.youtube.com/channel/${channelId}`,
    up: true,
    title: $("feed > title").first().text(),
    videos: videos.slice(0, 6),
    avg_views: avgViews,
    last_upload: lastUpload,
    uploads_last_30_days: last30,
    checked_at: new Date().toISOString(),
    scores: {
      Activity: activityScore,
      Reach: clamp((Math.log10(avgViews + 1) / 6) * 100),
      Consistency: clamp((last30 / 8) * 100),
    },
  };
}

/* ---------- ONE BRAND (website + socials) ---------- */
function cleanSocial(platform, value) {
  const v = String(value || "").trim();
  if (!v) return null;
  try {
    const parsed = normalize(v);
    return SOCIAL_HOSTS[platform].test(parsed.hostname) ? parsed.href : null;
  } catch {
    return null;
  }
}

async function analyzeBrand(brand) {
  const websiteInput = String(brand.website || "").trim();

  const socials = {};
  for (const platform of Object.keys(SOCIAL_HOSTS)) {
    const link = cleanSocial(platform, brand[platform]);
    if (link) socials[platform] = link;
  }

  if (!websiteInput && !Object.keys(socials).length) {
    throw new Error("Add a website or at least one social link");
  }

  const [webResult, ytResult] = await Promise.allSettled([
    websiteInput ? analyzeWebsite(normalize(websiteInput)) : Promise.resolve(null),
    socials.youtube ? analyzeYouTube(new URL(socials.youtube)) : Promise.resolve(null),
  ]);

  const website = webResult.status === "fulfilled" ? webResult.value : null;
  const youtube = ytResult.status === "fulfilled" ? ytResult.value : null;

  const errors = [];
  if (webResult.status === "rejected")
    errors.push(`Website: ${(webResult.reason && webResult.reason.message) || "failed"}`);
  if (ytResult.status === "rejected")
    errors.push(`YouTube: ${(ytResult.reason && ytResult.reason.message) || "failed"}`);

  const detected = [];
  if (website) {
    for (const [platform, link] of Object.entries(website.socials)) {
      if (!socials[platform]) {
        socials[platform] = link;
        detected.push(platform);
      }
    }
  }

  if (!website && !youtube && !Object.keys(socials).length) {
    throw new Error(errors[0] || "Could not read this brand");
  }

  const scores = {};
  if (website) Object.assign(scores, website.scores);
  if (youtube) Object.assign(scores, youtube.scores);
  scores["Social presence"] = clamp((Object.keys(socials).length / 5) * 100);

  let host = "";
  try {
    host = website ? new URL(website.url).hostname : "";
  } catch {}

  return {
    ok: true,
    type: "brand",
    name: String(brand.name || "").trim() || host || (youtube && youtube.title) || "Unnamed brand",
    website,
    youtube,
    socials,
    detected_socials: detected,
    errors,
    scores,
    overall: clamp(avg(Object.values(scores))),
    checked_at: new Date().toISOString(),
  };
}

/* ---------- COMPARISON + RECOMMENDATIONS ---------- */
function compare(me, others) {
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

/* ---------- API ENTRY ---------- */
export async function POST(req) {
  try {
    const body = await req.json();
    const me = body.me || {};
    const competitors = (body.competitors || []).slice(0, 4);

    const hasInput = (b) =>
      b &&
      ["website", "youtube", "instagram", "facebook", "twitter", "linkedin", "tiktok"].some((k) =>
        String(b[k] || "").trim()
      );

    if (!hasInput(me)) {
      return Response.json(
        { error: "Add your website or at least one of your social links" },
        { status: 400 }
      );
    }
    const filled = competitors.filter(hasInput);
    if (!filled.length) {
      return Response.json({ error: "Add at least one competitor with a link" }, { status: 400 });
    }

    const settled = await Promise.allSettled([me, ...filled].map(analyzeBrand));
    const profiles = settled.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const src = i === 0 ? me : filled[i - 1];
      return {
        ok: false,
        name: String(src.name || "").trim() || src.website || "Unnamed brand",
        error: (r.reason && r.reason.message) || "Analysis failed",
      };
    });

    const [myProfile, ...others] = profiles;
    if (!myProfile.ok) {
      return Response.json(
        { error: `Could not analyze your brand: ${myProfile.error}` },
        { status: 400 }
      );
    }

    return Response.json({
      me: myProfile,
      competitors: others,
      comparison: compare(myProfile, others),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json({ error: e.message || "Analysis failed" }, { status: 400 });
  }
}