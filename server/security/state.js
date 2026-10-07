import crypto from "node:crypto";

export function createOAuthState() {
  return crypto.randomBytes(32).toString("hex");
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
