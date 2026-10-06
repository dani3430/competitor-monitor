import { test } from "node:test";
import assert from "node:assert/strict";
import { createLimiter } from "./rateLimit.mjs";

test("limiter allows requests up to the limit, then blocks", () => {
  const check = createLimiter({ limit: 3, windowMs: 60000 });
  assert.equal(check("a", 1000).ok, true);
  assert.equal(check("a", 2000).ok, true);
  assert.equal(check("a", 3000).ok, true);
  const blocked = check("a", 4000);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter > 0);
});

test("limiter allows requests again after the window passes", () => {
  const check = createLimiter({ limit: 1, windowMs: 1000 });
  assert.equal(check("a", 0).ok, true);
  assert.equal(check("a", 500).ok, false);
  assert.equal(check("a", 1500).ok, true);
});

test("limiter counts each visitor separately", () => {
  const check = createLimiter({ limit: 1, windowMs: 60000 });
  assert.equal(check("a", 0).ok, true);
  assert.equal(check("b", 0).ok, true);
  assert.equal(check("a", 1).ok, false);
});