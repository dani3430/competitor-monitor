// Simple sliding-window limiter, kept in memory. Best effort on serverless hosting.
export function createLimiter({ limit, windowMs }) {
  const hits = new Map();

  return function check(key, now = Date.now()) {
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
    }

    recent.push(now);
    hits.set(key, recent);

    // Keep memory small: drop visitors whose hits have all expired
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      }
    }
    return { ok: true, retryAfter: 0 };
  };
}

export function clientKey(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0].trim() : "") || "unknown";
}