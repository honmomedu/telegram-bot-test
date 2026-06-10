import { createHash } from 'crypto';

// A QR/NFC card encodes:  SECATT-EMP:<code>:<token>
// token = short signature of (code + org secret) so cards can't be forged
// without knowing the org's secret.

export const CARD_PREFIX = 'SECATT-EMP';

export function cardToken(code: string, secret: string): string {
  return createHash('sha256').update(`${code}:${secret || 'x'}`).digest('hex').slice(0, 16);
}

export function buildCardPayload(code: string, secret: string): string {
  return `${CARD_PREFIX}:${code}:${cardToken(code, secret)}`;
}

/** Parse + verify a scanned card payload. Returns the code when valid. */
export function verifyCardPayload(payload: string, secret: string): string | null {
  if (typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== CARD_PREFIX) return null;
  const [, code, token] = parts;
  if (!code) return null;
  return cardToken(code, secret) === token ? code : null;
}
