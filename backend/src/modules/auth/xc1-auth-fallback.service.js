import { createRequire } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function extractRealm(loginEndpoint = '') {
  const match = String(loginEndpoint).match(/\/realms\/([^/]+)\//);
  return match?.[1] || 'Atlas';
}

function parseVmIp(baseUrl) {
  const parsed = new URL(baseUrl);
  return parsed.hostname;
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

function postForm(url, data) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(data).toString();
    const parsed = new URL(url);
    const transport = parsed.protocol === 'http:' ? http : https;
    const req = transport.request(parsed, {
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
        Origin: `${parsed.protocol}//${parsed.host}`,
        Referer: `${parsed.protocol}//${parsed.host}/`,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = raw ? JSON.parse(raw) : null; } catch {}
        resolve({ status: res.statusCode || 0, raw, json });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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
  const vmIp = parseVmIp(baseUrl);
  const tokenUrl = `${String(baseUrl).replace(/\/$/, '')}${authConfig.loginEndpoint}`;

  // First, try direct grant quickly. If it succeeds or fails for reasons other than
  // unauthorized_client, keep k6 direct auth path unchanged.
  const directData = {
    grant_type: safeString(body.grant_type || 'password'),
    client_id: clientId,
    username,
    password,
  };
  if (safeString(body.client_secret)) directData.client_secret = safeString(body.client_secret);
  if (authCode) directData[otpFieldName] = authCode;

  try {
    const directRes = await postForm(tokenUrl, directData);
    if (directRes.status >= 200 && directRes.status < 300 && directRes.json?.access_token) {
      return null;
    }
    if (directRes.json?.error !== 'unauthorized_client') {
      return null;
    }
  } catch {
    return null;
  }

  const modulePath = path.resolve(__dirname, '../../../../../xc1-ffdc-parser/server/src/services/xc1Auth.js');
  let xc1Auth;
  try {
    xc1Auth = require(modulePath);
  } catch {
    return null;
  }

  if (!xc1Auth?.loginAndResolveOrg) {
    return null;
  }

  const previousEnv = {
    REMOTE_FETCH_XC1_REALM: process.env.REMOTE_FETCH_XC1_REALM,
    REMOTE_FETCH_XC1_CLIENT_ID: process.env.REMOTE_FETCH_XC1_CLIENT_ID,
  };

  process.env.REMOTE_FETCH_XC1_REALM = realm;
  if (clientId) {
    process.env.REMOTE_FETCH_XC1_CLIENT_ID = clientId;
  }

  try {
    const resolved = await xc1Auth.loginAndResolveOrg({ vmIp, username, password, authCode });
    const bearerToken = safeString(resolved?.bearerToken);
    return bearerToken || null;
  } catch (err) {
    const message = err?.message || String(err);
    throw new Error(`XC1 fallback auth failed: ${message}`);
  } finally {
    if (previousEnv.REMOTE_FETCH_XC1_REALM === undefined) delete process.env.REMOTE_FETCH_XC1_REALM;
    else process.env.REMOTE_FETCH_XC1_REALM = previousEnv.REMOTE_FETCH_XC1_REALM;

    if (previousEnv.REMOTE_FETCH_XC1_CLIENT_ID === undefined) delete process.env.REMOTE_FETCH_XC1_CLIENT_ID;
    else process.env.REMOTE_FETCH_XC1_CLIENT_ID = previousEnv.REMOTE_FETCH_XC1_CLIENT_ID;
  }
}
