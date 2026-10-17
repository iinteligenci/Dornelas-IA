import test from "node:test";
import assert from "node:assert/strict";
import { encryptTokenPayload, decryptTokenPayload, decodeStoredConnection, tokenEncryptionKey } from "../security/token-vault.js";

const currentKey = "test-key-for-token-encryption-only-32-bytes-minimum";
const oldClientSecret = "legacy-client-secret-test-only";

test("OAuth payloads are encrypted and decrypt only with the configured key", () => {
  const secretPayload = JSON.stringify({ accessToken: "token-value-never-store-plaintext", refreshToken: "refresh-value" });
  const encrypted = encryptTokenPayload(currentKey, secretPayload);
  assert.equal(encrypted.includes("token-value-never-store-plaintext"), false);
  assert.equal(decryptTokenPayload(currentKey, encrypted), secretPayload);
  assert.equal(decryptTokenPayload("different-key", encrypted), null);
});

test("legacy OAuth payload is marked for migration to TOKEN_ENCRYPTION_KEY", () => {
  const legacy = encryptTokenPayload(oldClientSecret.padEnd(32, "x"), JSON.stringify({ accessToken: "legacy-token" }));
  const decoded = decodeStoredConnection(legacy, { encryptionKey: currentKey, legacySecret: oldClientSecret.padEnd(32, "x") });
  assert.deepEqual(decoded, { data: { accessToken: "legacy-token" }, needsMigration: true, needsReconnect: false });
});

test("missing or changed TOKEN_ENCRYPTION_KEY asks for reconnection without throwing", () => {
  const encrypted = encryptTokenPayload(currentKey, JSON.stringify({ refreshToken: "refresh-token" }));
  assert.deepEqual(decodeStoredConnection(encrypted, { encryptionKey: null, legacySecret: "unrelated-client-secret" }), { data: null, needsMigration: false, needsReconnect: true });
  assert.deepEqual(decodeStoredConnection(encrypted, { encryptionKey: "wrong-key-that-is-long-enough-xxxxxxxx", legacySecret: "unrelated-client-secret" }), { data: null, needsMigration: false, needsReconnect: true });
  assert.equal(tokenEncryptionKey({ TOKEN_ENCRYPTION_KEY: "short" }), null);
});
