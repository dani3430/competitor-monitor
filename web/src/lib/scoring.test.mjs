import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  avg,
  median,
  extractPrices,
  speedScore,
  websiteScores,
  compare,
} from "./scoring.mjs";

test("clamp keeps numbers between 0 and 100", () => {
  assert.equal(clamp(-5), 0);
  assert.equal(clamp(150), 100);
  assert.equal(clamp(49.6), 50);
});

test("avg and median handle empty and normal lists", () => {
  assert.equal(avg([]), 0);
  assert.equal(avg([10, 20, 30]), 20);
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("extractPrices finds amounts and the currency", () => {
  const r = extractPrices("Plans from $19.99 per month, Pro $1,200 yearly");
  assert.deepEqual(r.values, [19.99, 1200]);
  assert.equal(r.currency, "$");
});

test("extractPrices returns nothing when there are no prices", () => {
  const r = extractPrices("No prices here, just words");
  assert.deepEqual(r.values, []);
  assert.equal(r.currency, null);
});

test("speedScore gives faster sites higher scores", () => {
  assert.equal(speedScore(200), 100);
  assert.equal(speedScore(600), 80);
  assert.equal(speedScore(1000), 60);
  assert.equal(speedScore(2000), 40);
  assert.equal(speedScore(5000), 20);
});

const emptySite = {
  pricing: { found: false, free_trial: false, free_plan: false },
  pricingUrl: null,
  promos: [],
  hasBlog: false,
  hasTrust: false,
  headingsCount: 0,
  schema: false,
  socialCount: 0,
  url: "http://example.com",
  title: "",
  description: "",
  image: "",
  h1Count: 0,
  ms: 5000,
};

test("a bare site scores 0 on pricing, promotion, content and social", () => {
  const s = websiteScores(emptySite);
  assert.equal(s["Pricing transparency"], 0);
  assert.equal(s.Promotion, 0);
  assert.equal(s["Content & trust"], 0);
  assert.equal(s["Social presence"], 0);
  assert.equal(s["SEO basics"], 0);
  assert.equal(s.Speed, 20);
});

test("a rich site scores high", () => {
  const s = websiteScores({
    ...emptySite,
    pricing: { found: true, free_trial: true, free_plan: false },
    pricingUrl: "https://x.com/pricing",
    promos: ["Percent discount", "Free trial", "Money-back guarantee", "Free shipping"],
    hasBlog: true,
    hasTrust: true,
    headingsCount: 6,
    schema: true,
    socialCount: 5,
    url: "https://x.com",
    title: "A good page title that is long enough to count",
    description: "A helpful description that explains what this page is about in enough detail.",
    image: "https://x.com/og.png",
    h1Count: 1,
    ms: 200,
  });
  assert.equal(s["Pricing transparency"], 100);
  assert.equal(s.Promotion, 100);
  assert.equal(s["Content & trust"], 100);
  assert.equal(s["Social presence"], 100);
  assert.equal(s["SEO basics"], 100);
  assert.equal(s.Speed, 100);
});

const brand = (name, scores, extra = {}) => ({
  ok: true,
  name,
  scores,
  overall: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length),
  socials: {},
  website: null,
  ...extra,
});

test("compare returns null when no competitor could be read", () => {
  const me = brand("Me", { Speed: 50 });
  assert.equal(compare(me, [{ ok: false, error: "failed" }]), null);
});

test("compare flags a big gap as a high-priority recommendation", () => {
  const me = brand("Me", { Speed: 20 });
  const rival = brand("Rival", { Speed: 100 });
  const r = compare(me, [rival]);
  assert.equal(r.recommendations[0].priority, "high");
  assert.equal(r.recommendations[0].area, "Speed");
  assert.equal(r.rank, 2);
});

test("compare lists a strength when you beat competitors", () => {
  const me = brand("Me", { Speed: 100 });
  const rival = brand("Rival", { Speed: 40 });
  const r = compare(me, [rival]);
  assert.equal(r.strengths.length, 1);
  assert.equal(r.rank, 1);
});

test("compare reports channels that only competitors have", () => {
  const me = brand("Me", { Speed: 50 });
  const rival = brand("Rival", { Speed: 50 }, { socials: { youtube: "https://youtube.com/x" } });
  const r = compare(me, [rival]);
  assert.ok(r.recommendations.some((x) => x.area === "Channels"));
});