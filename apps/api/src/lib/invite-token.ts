import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
export const INVITE_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface InvitePayload {
  userId: string;
  email: string;
  role: string;
}

function getKey() {
  return createHash("sha256")
    .update(env.INVITE_SECRET ?? env.BETTER_AUTH_SECRET)
    .digest();
}

export function createInviteToken(
  payload: InvitePayload,
  ttlMs: number = INVITE_TOKEN_TTL_MS,
): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + ttlMs });
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function verifyInviteToken(token: string): InvitePayload {
  const buffer = Buffer.from(token, "base64url");
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Invalid invite token");
  }
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  const data = JSON.parse(decrypted) as InvitePayload & { exp: number };
  if (Date.now() > data.exp) throw new Error("Invite token has expired");
  return { userId: data.userId, email: data.email, role: data.role };
}