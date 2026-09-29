import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Acuity signs each webhook with X-Acuity-Signature: the base64 HMAC-SHA256
 * of the raw request body, keyed with the account's API key.
 */
export function isValidAcuitySignature(
  rawBody: string,
  signature: string | undefined,
  apiKey: string | undefined,
): boolean {
  if (!signature || !apiKey) return false;
  const expected = createHmac("sha256", apiKey).update(rawBody).digest();
  const received = Buffer.from(signature, "base64");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
