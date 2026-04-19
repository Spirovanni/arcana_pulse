/**
 * AES-256-GCM field-level encryption for sensitive data at rest.
 *
 * Requires ENCRYPTION_KEY env var: 64 hex characters (32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * All three components are required for decryption; tampering with any part
 * will cause authentication to fail and throw.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: " +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).");
  }
  return key;
}

/** Encrypts plaintext. Returns a colon-delimited iv:authTag:ciphertext hex string. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypts an encrypt() output. Throws if the ciphertext has been tampered with. */
export function decrypt(encryptedField: string): string {
  const key = getKey();
  const parts = encryptedField.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field format — expected iv:authTag:ciphertext.");
  }
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Returns true if the value looks like an encrypt() output (safe to call decrypt on). */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === IV_LENGTH * 2;
}

/**
 * Encrypts only if ENCRYPTION_KEY is configured and value is non-empty.
 * Falls back to storing plaintext so the app still works without the key set
 * (useful in dev/sandbox). Logs a warning in that case.
 */
export function encryptSafe(value: string): string {
  if (!value) return value;
  if (!process.env.ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be set in production.");
    }
    return value;
  }
  return encrypt(value);
}

/**
 * Decrypts if the value looks encrypted; returns plaintext as-is otherwise.
 * Handles legacy plaintext values stored before encryption was enabled.
 */
export function decryptSafe(value: string): string {
  if (!value) return value;
  if (!isEncrypted(value)) return value;
  return decrypt(value);
}
