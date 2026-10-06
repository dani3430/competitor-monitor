import * as cheerio from "cheerio";
import { clamp, avg, median, extractPrices, websiteScores, assessQuality, compare } from "@/lib/scoring.mjs";
import { ruleSummary } from "@/lib/summary.mjs";
import { createLimiter, clientKey } from "@/lib/rateLimit.mjs";

export const maxDuration = 30;
// 10 analyses per visitor every 10 minutes (only enforced on the live site)
const analyzeLimiter = createLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

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

  const quality = assessQuality({
    status: res.status,
    textLength: text.length,
    linkCount: $("a[href]").length,
    headingsCount: headings.length,
  });
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
    quality,
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

    profile.scores = websiteScores({
    pricing,
    pricingUrl,
    promos,
    hasBlog,
    hasTrust,
    headingsCount: headings.length,
    schema,
    socialCount: Object.keys(socials).length,
    url: res.url,
    title,
    description,
    image,
    h1Count,
    ms,
  });
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
    limited: Boolean(website && website.quality.limited && !youtube),
  };
}

/* ---------- API ENTRY ---------- */
export async function POST(req) {
  try {
    if (process.env.NODE_ENV === "production") {
      const gate = analyzeLimiter(clientKey(req));
      if (!gate.ok) {
        return Response.json(
          { error: `Too many analyses. Please try again in ${gate.retryAfter} seconds.` },
          { status: 429 }
        );
      }
    }

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

        const comparison = compare(myProfile, others);
    const result = { me: myProfile, competitors: others, comparison };

        const summary = { text: ruleSummary(result), source: "rules" };
    return Response.json({ ...result, summary, generated_at: new Date().toISOString() });
  } catch (e) {
    return Response.json({ error: e.message || "Analysis failed" }, { status: 400 });
  }
}