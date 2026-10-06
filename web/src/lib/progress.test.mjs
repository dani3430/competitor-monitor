import { test } from "node:test";
import assert from "node:assert/strict";
import { brandKey, findPrevious, scoreChanges } from "./progress.mjs";

const report = (id, generated_at, host, scores, overall, extra = {}) => ({
  id,
  result: {
    generated_at,
    me: {
      name: host,
      website: { url: `https://www.${host}/` },
      scores,
      overall,
      ...extra,
    },
  },
});

test("brandKey uses the website host without www", () => {
  assert.equal(brandKey({ name: "X", website: { url: "https://www.shop.com/a" } }), "shop.com");
});

test("brandKey falls back to the name when there is no website", () => {
  assert.equal(brandKey({ name: "My Brand" }), "my brand");
});

test("findPrevious returns the next older report of the same brand", () => {
  const saved = [
    report("3", "t3", "shop.com", { Speed: 80 }, 80),
    report("2", "t2", "other.com", { Speed: 50 }, 50),
    report("1", "t1", "shop.com", { Speed: 60 }, 60),
  ];
  const prev = findPrevious(saved, saved[0].result);
  assert.equal(prev.id, "1");
});

test("findPrevious returns null when there is no older report of that brand", () => {
  const saved = [
    report("2", "t2", "shop.com", { Speed: 80 }, 80),
    report("1", "t1", "other.com", { Speed: 60 }, 60),
  ];
  assert.equal(findPrevious(saved, saved[0].result), null);
});

test("findPrevious returns null when the report is not in the saved list", () => {
  const saved = [report("1", "t1", "shop.com", { Speed: 60 }, 60)];
  assert.equal(findPrevious(saved, { generated_at: "other", me: saved[0].result.me }), null);
});

test("scoreChanges calculates differences per area", () => {
  const now = report("2", "t2", "shop.com", { Speed: 80, "SEO basics": 40 }, 60).result;
  const before = report("1", "t1", "shop.com", { Speed: 60, "SEO basics": 50 }, 55).result;
  const c = scoreChanges(now, before);
  assert.equal(c.overall.delta, 5);
  assert.equal(c.rows.find((r) => r.name === "Speed").delta, 20);
  assert.equal(c.rows.find((r) => r.name === "SEO basics").delta, -10);
  assert.equal(c.limited, false);
});

test("scoreChanges flags limited data on either report", () => {
  const now = report("2", "t2", "shop.com", { Speed: 80 }, 80, { limited: true }).result;
  const before = report("1", "t1", "shop.com", { Speed: 60 }, 60).result;
  assert.equal(scoreChanges(now, before).limited, true);
});