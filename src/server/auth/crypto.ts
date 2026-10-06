/**
 * Opaque session tokens. Pure functions over Node crypto; nothing here touches
 * the database or the request.
 */
import { generateIdFromEntropySize } from "@/lib/random";

import { createHash, timingSafeEqual } from "node:crypto";

/** SHA-256 of a high-entropy secret. Not for passwords. */
export const hashSecret = (secret: string): Buffer =>
  createHash("sha256").update(secret).digest();

export const secretHashEquals = (a: Buffer, b: Buffer): boolean =>
  a.byteLength === b.byteLength && timingSafeEqual(a, b);

/**
 * `<id>.<secret>`: the id locates the row, the secret is compared against
 * the stored hash. Return the token to the client once, then forget it.
 */
export const generateSessionToken = () => {
  const id = generateIdFromEntropySize(15);
  const secret = generateIdFromEntropySize(20);
  return { id, secretHash: hashSecret(secret), token: `${id}.${secret}` };
};

export const parseSessionToken = (
  token: string,
): { id: string; secret: string } | null => {
  const [id, secret, ...rest] = token.split(".");
  return id && secret && rest.length === 0 ? { id, secret } : null;
};
