/**
 * The two secrets a gift can carry, and how they are kept.
 *
 * Flora has no accounts, and this is the whole reason it can afford not to: a gift needs
 * exactly two credentials, and neither of them is an identity.
 *
 *   A PIN   — what the recipient types. Four to six digits. It is stored as a salted
 *             scrypt hash, so the database never holds anything that can be read out and
 *             reused elsewhere. Comparison is constant-time.
 *
 *   A key   — what the *sender* keeps. A 32-byte random token, shown once at creation and
 *             never again. Only its SHA-256 lives in the row, so a leaked database hands
 *             nobody the ability to edit or delete a gift. Losing the key loses the ability
 *             to edit; it does not destroy the gift.
 *
 * Everything here runs on the server only. The client never hashes anything: a PIN that
 * was hashed in the browser could be replaced by a crafted request, so the checks live in
 * the route handler holding the service key.
 */

import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const PIN_LENGTH = { min: 4, max: 6 } as const;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH.min},${PIN_LENGTH.max}}$`).test(pin);
}

/** `scrypt$<salt hex>$<hash hex>` — self-describing, so the format can change later. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(pin, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Constant-time by construction: both sides are the same length when the hash is
 * well-formed, and a malformed row fails closed rather than throwing.
 */
export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  if (!stored || !isValidPin(pin)) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scryptAsync(pin, salt, expected.length);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** A sender's key. 32 bytes of entropy, base64url, eight characters of preamble gone. */
export function makeOwnerKey(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOwnerKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyOwnerKey(key: string, stored: string | null): boolean {
  if (!stored || !key) return false;
  const a = Buffer.from(hashOwnerKey(key), "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A display code for the PIN prompt: four digits are easy to mistype, so the number of
 * attempts a single link will accept is bounded by the row, not by the client.
 */
export const MAX_PIN_ATTEMPTS = 8;

/** Five digits is the sweet spot — memorable, and not worth brute-forcing eight times. */
export function suggestPin(): string {
  return String(randomInt(10000, 100000));
}
