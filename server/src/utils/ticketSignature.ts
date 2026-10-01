import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ENV } from '../config/env';

/**
 * VaultPass — tamper-proof ticket tokens.
 *
 * Format:  TV1.<base64url(payload JSON)>.<base64url(HMAC-SHA256)>
 *
 * The HMAC is computed over "TV1.<payload>" with a server-only secret, so a
 * QR code cannot be forged or edited (e.g. swapping seat labels or the
 * booking reference) without the signature check failing at the gate.
 * Each issue carries a random nonce, so re-issuing a pass (ticket transfer)
 * produces a different token and the previous QR stops matching the booking.
 */

const VERSION = 'TV1';

export interface VaultPassClaims {
  ref: string; // booking reference
  eid: string; // event id
  seats: string[]; // seat labels
  iat: number; // issued-at (unix seconds)
  n: string; // per-issue nonce
}

export type VaultPassVerification =
  | { valid: true; claims: VaultPassClaims }
  | { valid: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' };

const sign = (data: string): string =>
  createHmac('sha256', ENV.TICKET_SIGNING_SECRET).update(data).digest('base64url');

export const isVaultPassToken = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(`${VERSION}.`);

export const issueVaultPass = (claims: Omit<VaultPassClaims, 'iat' | 'n'>): string => {
  const full: VaultPassClaims = {
    ...claims,
    iat: Math.floor(Date.now() / 1000),
    n: randomBytes(6).toString('base64url'),
  };
  const body = `${VERSION}.${Buffer.from(JSON.stringify(full)).toString('base64url')}`;
  return `${body}.${sign(body)}`;
};

export const verifyVaultPass = (token: string): VaultPassVerification => {
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const body = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(body));
  const provided = Buffer.from(parts[2]);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as VaultPassClaims;
    if (!claims.ref || !claims.eid) return { valid: false, reason: 'MALFORMED' };
    return { valid: true, claims };
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }
};
