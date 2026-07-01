import crypto from 'node:crypto';
import { AuthService } from './auth.service.js';
import { resolveKeycloakToken } from './keycloak-auth.service.js';

const svc = new AuthService();

// Generate a fresh TOTP code from a Base32-encoded secret.
// Called at refresh time so the code is always current (not stale).
function generateTotpFromSecret(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const input = String(secret || '').replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  let bits = 0, value = 0;
  const bytes = [];
  for (const ch of input) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  const key = Buffer.from(bytes);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const msg = Buffer.alloc(8);
  msg.writeUInt32BE(counter, 4);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return String(code).padStart(6, '0');
}

// Token cache for shared service accounts: cache[key] = { token, expiresAt }
// When multiple VUs use the same account, we cache the token for N seconds
// to avoid hammering Keycloak with simultaneous refresh requests.
const tokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 30000; // Cache refreshed tokens for 30 seconds

// In-flight refresh map: cache[key] = Promise
// When a refresh is already in progress for the same account, subsequent
// requests await the SAME promise instead of each firing a separate Keycloak
// login. This is the critical deduplication that prevents N-VU thundering herd.
const inflightRefreshes = new Map();

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw Object.assign(new Error('email and password required'), { statusCode: 400 });
    const data = await svc.login(email, password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listAuthConfigs(req, res, next) {
  try {
    const data = await svc.listConfigs();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAuthConfig(req, res, next) {
  try {
    const data = await svc.getConfigById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAuthConfig(req, res, next) {
  try {
    const data = await svc.createConfig(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAuthConfig(req, res, next) {
  try {
    const data = await svc.updateConfig(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAuthConfig(req, res, next) {
  try {
    await svc.deleteConfig(req.params.id);
    res.json({ success: true, message: 'Auth config deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh-token-via-browser
 * 
 * For k6 scenarios: When token expires (401), k6 calls this endpoint
 * to refresh the token via browser/PKCE flow (for public clients).
 * 
 * For shared service accounts (one account, many VUs), tokens are cached
 * for 10 seconds to avoid hammering Keycloak with simultaneous refresh
 * requests from all VUs.
 * 
 * Request body:
 * {
 *   baseUrl: "https://10.241.59.2",
 *   realm: "Atlas",
 *   clientId: "frontend",
 *   username: "user@example.com",
 *   password: "password",
 *   authCode?: "123456" (optional OTP code)
 * }
 * 
 * Response: { accessToken: "eyJ...", expiresIn: 3600 }
 */
export async function refreshTokenViaBrowser(req, res, next) {
  try {
    const { baseUrl, realm, clientId, username, password, authCode, otpSecret } = req.body;
    
    // If caller passed a raw TOTP secret, generate a fresh code right now.
    // This ensures the OTP code is always current, never stale.
    const resolvedAuthCode = otpSecret ? generateTotpFromSecret(otpSecret) : (authCode || undefined);

    if (!baseUrl || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: baseUrl, username, password',
      });
    }

    // Cache key: username@baseUrl (to handle multiple backends/accounts)
    const cacheKey = `${username}@${baseUrl}`;
    const now = Date.now();
    
    // 1. Check cache: if we refreshed this account recently, reuse the token
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      console.log('[auth] Token cache HIT for ' + username + ' (expires in ' + (cached.expiresAt - now) + 'ms)');
      return res.json({
        success: true,
        data: { accessToken: cached.accessToken, expiresIn: cached.expiresIn || 3600 },
      });
    }

    // 2. Check if a refresh is already in-flight for this account.
    //    If so, wait for that promise instead of firing a second Keycloak login.
    //    This is the key deduplication: 30 VUs hitting 401 simultaneously will all
    //    await the same single promise — only ONE browser/PKCE flow runs.
    if (inflightRefreshes.has(cacheKey)) {
      console.log('[auth] Refresh already in-flight for ' + username + ', waiting for it to complete...');
      try {
        const tokenData = await inflightRefreshes.get(cacheKey);
        return res.json({
          success: true,
          data: { accessToken: tokenData.accessToken, expiresIn: tokenData.expiresIn || 3600 },
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // 3. No cache, no in-flight: this request is the one that actually refreshes.
    console.log('[auth] Token cache MISS for ' + username + ', starting browser/PKCE refresh...');

    const refreshPromise = resolveKeycloakToken({
      baseUrl,
      realm: realm || 'Atlas',
      clientId: clientId || 'frontend',
      username,
      password,
      authCode: resolvedAuthCode,
    }).then((tokenData) => {
      // Cache the token so future requests within TTL reuse it
      tokenCache.set(cacheKey, {
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn || 3600,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      });
      return tokenData;
    }).finally(() => {
      // Always remove from inflight map when done (success or error)
      inflightRefreshes.delete(cacheKey);
    });

    // Register the promise so concurrent requests can await it
    inflightRefreshes.set(cacheKey, refreshPromise);

    try {
      const tokenData = await refreshPromise;
      return res.json({
        success: true,
        data: { accessToken: tokenData.accessToken, expiresIn: tokenData.expiresIn || 3600 },
      });
    } catch (keycloakErr) {
      const errMsg = String(keycloakErr.message || '');
      console.error('[auth] Keycloak browser login failed for ' + username + ':', errMsg);

      if (/account.*disabled|temporarily disabled/i.test(errMsg)) {
        return res.status(403).json({ success: false, error: 'Account is temporarily disabled or locked' });
      }

      // Other Keycloak errors (auth failed, invalid creds, etc)
      res.status(401).json({
        success: false,
        error: 'Token refresh failed: ' + errMsg,
      });
    }
  } catch (err) {
    console.error('[auth] Unexpected error in refreshTokenViaBrowser:', err.message);
    next(err);
  }
}
