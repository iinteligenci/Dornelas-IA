import test from "node:test";
import assert from "node:assert/strict";
import { schedulerSecretMatches, createAttemptLimiter } from "../security/scheduler-auth.js";

test("scheduler secret matcher accepts only exact values with fixed-size timing-safe comparison", () => {
  assert.equal(schedulerSecretMatches("correct-secret", "correct-secret"), true);
  assert.equal(schedulerSecretMatches("incorrect", "correct-secret"), false);
  assert.equal(schedulerSecretMatches("", "correct-secret"), false);
  assert.equal(schedulerSecretMatches("anything", ""), false);
});

test("scheduler limiter blocks after the configured attempts and resets after its window", () => {
  let now = 1000;
  const limiter = createAttemptLimiter({ limit: 2, windowMs: 5000, now: () => now });
  assert.equal(limiter.check("127.0.0.1").allowed, true);
  assert.equal(limiter.check("127.0.0.1").allowed, true);
  assert.deepEqual(limiter.check("127.0.0.1"), { allowed: false, retryAfterSeconds: 5 });
  now += 5000;
  assert.equal(limiter.check("127.0.0.1").allowed, true);
});
