import crypto from "node:crypto";

// Hashing both values first gives timingSafeEqual fixed-size inputs regardless of secret length.
export function schedulerSecretMatches(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  const providedDigest = crypto.createHash("sha256").update(provided, "utf8").digest();
  const expectedDigest = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export function createAttemptLimiter({ limit = 10, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return {
    check(key) {
      const timestamp = now();
      let bucket = buckets.get(key);
      if (!bucket || timestamp - bucket.startedAt >= windowMs) {
        bucket = { startedAt: timestamp, attempts: 0 };
        buckets.set(key, bucket);
      }
      if (bucket.attempts >= limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (timestamp - bucket.startedAt)) / 1000)) };
      bucket.attempts += 1;
      if (buckets.size > 1000) {
        for (const [bucketKey, value] of buckets) if (timestamp - value.startedAt >= windowMs) buckets.delete(bucketKey);
      }
      return { allowed: true, remaining: limit - bucket.attempts };
    },
    reset(key) { buckets.delete(key); }
  };
}
