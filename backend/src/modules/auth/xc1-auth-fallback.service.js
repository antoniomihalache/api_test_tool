import crypto from 'node:crypto';
import { resolveKeycloakToken } from './keycloak-auth.service.js';

function extractRealm(loginEndpoint = '') {
  const match = String(loginEndpoint).match(/\/realms\/([^/]+)\//);
  return match?.[1] || 'Atlas';
}

function safeString(value) {
  return value == null ? '' : String(value).trim();
}

function base32ToBuffer(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const input = String(secret || '').replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of input) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpFromSecret(secret) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(counter, 4);
  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(code).padStart(6, '0');
}

export async function tryResolveXc1TokenFallback({ baseUrl, authConfig }) {
  if (!authConfig?.loginEndpoint || !String(authConfig.loginEndpoint).includes('/protocol/openid-connect/token')) {
    return null;
  }

  const body = authConfig.loginBody || {};
  const username = safeString(body.username);
  const password = safeString(body.password);
  const otpFieldName = authConfig.otpFieldName || 'totp';
  const otpMode = authConfig.otpMode || 'none';
  const authCode = safeString(
    body[otpFieldName]
    || body.otp
    || body.totp
    || (otpMode === 'secret' && authConfig.otpSecret ? generateTotpFromSecret(authConfig.otpSecret) : '')
  );
  const clientId = safeString(body.client_id);

  if (!username || !password) {
    return null;
  }

  const realm = extractRealm(authConfig.loginEndpoint);
  const baseUrlNormalized = String(baseUrl).replace(/\/$/, '');

  try {
    const tokenData = await resolveKeycloakToken({
      baseUrl: baseUrlNormalized,
      realm,
      clientId: clientId || undefined,
      username,
      password,
      authCode: authCode || undefined,
    });
    return tokenData;
  } catch (err) {
    const message = err?.message || String(err);
    throw new Error(`Keycloak fallback auth failed: ${message}`);
  }
}
