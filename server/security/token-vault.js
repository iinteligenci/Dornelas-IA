import crypto from "node:crypto";

export function tokenEncryptionKey(env = process.env) {
  const value = env.TOKEN_ENCRYPTION_KEY;
  return value && Buffer.byteLength(value, "utf8") >= 32 ? value : null;
}

export function encryptTokenPayload(secret, value) {
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) throw new Error("TOKEN_ENCRYPTION_KEY ausente ou com menos de 32 bytes.");
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptTokenPayload(secret, value) {
  if (!secret || !value) return null;
  try {
    const key = crypto.createHash("sha256").update(String(secret)).digest();
    const data = Buffer.from(value, "base64url");
    if (data.length < 29) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return decipher.update(data.subarray(28), undefined, "utf8") + decipher.final("utf8");
  } catch { return null; }
}

/** Reads the dedicated key first, then temporarily supports legacy client-secret encryption. */
export function decodeStoredConnection(encrypted, { encryptionKey, legacySecret } = {}) {
  const current = decryptTokenPayload(encryptionKey, encrypted);
  if (current !== null) {
    try { return { data: JSON.parse(current), needsMigration: false, needsReconnect: false }; }
    catch { return { data: null, needsMigration: false, needsReconnect: true }; }
  }
  const legacy = decryptTokenPayload(legacySecret, encrypted);
  if (legacy !== null) {
    try { return { data: JSON.parse(legacy), needsMigration: true, needsReconnect: false }; }
    catch { return { data: null, needsMigration: false, needsReconnect: true }; }
  }
  return { data: null, needsMigration: false, needsReconnect: Boolean(encrypted) };
}
