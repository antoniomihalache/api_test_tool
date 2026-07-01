import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';

const DEFAULT_REALM = 'Atlas';
const DEFAULT_CLIENT_ID = 'frontend';
const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_TIMEOUT_MS = 20000;

// ── Utilities ────────────────────────────────────────────────────

function randomBase64Url(bytes = 32) {
  return Buffer.from(crypto.randomBytes(bytes))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sha256Base64Url(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeHtmlEntities(value) {
  const map = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  };
  return String(value || '').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const normalized = String(e).toLowerCase();
    return map[normalized] || (normalized.startsWith('#x') 
      ? String.fromCharCode(parseInt(normalized.slice(2), 16))
      : normalized.startsWith('#')
      ? String.fromCharCode(parseInt(normalized.slice(1)))
      : m);
  });
}

function parseSetCookie(setCookieHeader) {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
  return values
    .map((entry) => String(entry).split(';', 1)[0].trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf('=');
      if (idx < 0) return null;
      return [entry.slice(0, idx), entry.slice(idx + 1)];
    })
    .filter(Boolean);
}

function buildCookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function buildAbsoluteUrl(baseUrl, nextUrl) {
  return new URL(nextUrl, baseUrl).toString();
}

function extractAuthorizationCode(url, expectedState) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  if (!code) return null;
  if (expectedState && state && state !== expectedState) {
    throw new Error('XC1 login returned an unexpected OAuth state');
  }
  return code;
}

function pickErrorMessage(response, fallback) {
  if (response?.json?.error_description) return response.json.error_description;
  if (response?.json?.error) return response.json.error;
  if (response?.raw) return response.raw;
  return fallback;
}

function extractHtmlMessage(html) {
  const source = String(html || '');
  const patterns = [
    /<div[^>]*class=["'][^"']*(?:alert|error|kc-feedback-text|instruction)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<span[^>]*class=["'][^"']*(?:alert|error|kc-feedback-text)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match?.[1]) {
      return match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].replace(/\s+/g, ' ').trim();
  }
  return null;
}

function extractPageTitle(html) {
  const titleMatch = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch?.[1]) return null;
  return titleMatch[1].replace(/\s+/g, ' ').trim();
}

// ── HTTP request ─────────────────────────────────────────────────

function requestUrl(url, { method = 'GET', headers = {}, body, jar } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'http:' ? http : https;
    const mergedHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...headers,
    };
    if (jar && jar.size) {
      mergedHeaders.Cookie = buildCookieHeader(jar);
    }
    const req = transport.request(
      target,
      {
        method,
        headers: mergedHeaders,
        rejectUnauthorized: false,
        timeout: DEFAULT_TIMEOUT_MS,
      },
      (res) => {
        if (jar) {
          for (const [name, value] of parseSetCookie(res.headers['set-cookie'])) {
            jar.set(name, value);
          }
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {}
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            raw,
            json,
            url,
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Request timed out for ${url}`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Form parsing ─────────────────────────────────────────────────

function extractInputDescriptors(formBody) {
  const inputs = [];
  const regex = /<input\b([^>]*)>/gi;
  let match;
  while ((match = regex.exec(String(formBody || '')))) {
    const attrs = match[1] || '';
    const getAttr = (name) => {
      const attrMatch = attrs.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
      return attrMatch?.[1] ? decodeHtmlEntities(attrMatch[1]) : '';
    };
    inputs.push({
      id: getAttr('id'),
      name: getAttr('name'),
      type: getAttr('type').toLowerCase() || 'text',
      className: getAttr('class'),
      value: getAttr('value'),
      readOnly: /\breadonly\b/i.test(attrs),
    });
  }
  return inputs;
}

function extractInputs(formBody) {
  const fields = {};
  const regex = /<input\b([^>]*)>/gi;
  let match;
  while ((match = regex.exec(String(formBody || '')))) {
    const attrs = match[1] || '';
    const nameMatch = attrs.match(/name=["']([^"']+)["']/i);
    if (!nameMatch) continue;
    const valueMatch = attrs.match(/value=["']([^"']*)["']/i);
    fields[decodeHtmlEntities(nameMatch[1])] = valueMatch?.[1] ? decodeHtmlEntities(valueMatch[1]) : '';
  }
  return fields;
}

function extractForms(html) {
  const forms = [];
  const regex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let match;
  while ((match = regex.exec(String(html || '')))) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const actionMatch = attrs.match(/action=["']([^"']+)["']/i);
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    forms.push({
      id: idMatch?.[1] || null,
      action: actionMatch?.[1] ? decodeHtmlEntities(actionMatch[1]) : null,
      body,
    });
  }
  return forms;
}

function hasEditableUsernameInput(source) {
  return extractInputDescriptors(source).some(
    (input) => /^(username|email)$/i.test(input.name) && !input.readOnly
  );
}

function hasReadonlyUsernameInput(source) {
  return extractInputDescriptors(source).some(
    (input) => /^(username|email)$/i.test(input.name) && input.readOnly
  );
}

function hasPasswordInput(source) {
  return extractInputDescriptors(source).some(
    (input) => /^password$/i.test(input.name) || input.type === 'password'
  );
}

function detectPageStage(html) {
  const lower = String(html || '').toLowerCase();
  const hasEditableUsernameField = hasEditableUsernameInput(html);
  const hasReadonlyUsernameField = hasReadonlyUsernameInput(html);
  const hasUsernameField = hasEditableUsernameField || hasReadonlyUsernameField;
  const hasPasswordField = hasPasswordInput(html);
  const hasOtpMarkers =
    /name=["'](?:totp|otp|code|authcode|totpcode)["']/.test(lower) ||
    /id=["']otp-field-[1-6]["']/.test(lower) ||
    /class=["'][^"']*otp-field[^"']*["']/.test(lower) ||
    /class=["'][^"']*otp-input[^"']*["']/.test(lower) ||
    /kc-totp|totp-main-container|authenticator/i.test(lower);
  if (hasOtpMarkers) return 'otp';
  if (hasEditableUsernameField) return 'username';
  if (hasUsernameField && hasPasswordField) return 'password';
  if (hasUsernameField) return 'username';
  return 'unknown';
}

function chooseLoginForm(html, preferredStage = null) {
  const forms = extractForms(html);
  if (preferredStage === 'otp') {
    return (
      forms.find((form) => /otp-field|kc-totp|totp|authenticator/i.test(form.body)) ||
      forms.find((form) => /otp|code/i.test(form.body)) ||
      forms[0] ||
      null
    );
  }
  if (preferredStage === 'password') {
    return (
      forms.find((form) => hasPasswordInput(form.body) && hasReadonlyUsernameInput(form.body)) ||
      forms.find((form) => hasPasswordInput(form.body)) ||
      forms.find((form) => form.id === 'kc-form-login') ||
      forms[0] ||
      null
    );
  }
  return (
    forms.find((form) => /otp-field|kc-totp|totp|authenticator/i.test(form.body)) ||
    forms.find((form) => form.id === 'kc-form-login') ||
    forms.find((form) => /username|password/i.test(form.body)) ||
    forms[0] ||
    null
  );
}

async function followRedirects(startUrl, jar, headers = {}, maxRedirects = 10) {
  let currentUrl = startUrl;
  let previousUrl = null;
  for (let i = 0; i < maxRedirects; i++) {
    const currentHeaders = { ...headers, ...(previousUrl ? { Referer: previousUrl } : {}) };
    const response = await requestUrl(currentUrl, { method: 'GET', headers: currentHeaders, jar });
    const location = response.headers.location;
    if (response.status >= 300 && response.status < 400 && location) {
      previousUrl = currentUrl;
      currentUrl = buildAbsoluteUrl(currentUrl, location);
      continue;
    }
    return { ...response, finalUrl: currentUrl };
  }
  throw new Error('Too many redirects during Keycloak login');
}

async function submitHtmlForm({ pageUrl, html, overrides, jar, origin, preferredStage }) {
  const form = chooseLoginForm(html, preferredStage);
  if (!form?.action) {
    throw new Error('Could not locate Keycloak login form');
  }
  const actionUrl = buildAbsoluteUrl(pageUrl, form.action);
  const fields = { ...extractInputs(form.body), ...overrides };
  const body = new URLSearchParams(fields).toString();
  return requestUrl(actionUrl, {
    method: 'POST',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      Origin: origin,
      Referer: pageUrl,
    },
    body,
    jar,
  });
}

// ── Keycloak login flow ──────────────────────────────────────────

async function completeBrowserLogin({ baseOrigin, username, password, authCode }) {
  const realm = process.env.REMOTE_FETCH_XC1_REALM || DEFAULT_REALM;
  const clientId = process.env.REMOTE_FETCH_XC1_CLIENT_ID || DEFAULT_CLIENT_ID;
  const scope = process.env.REMOTE_FETCH_XC1_SCOPE || DEFAULT_SCOPE;
  const redirectUri = process.env.REMOTE_FETCH_XC1_REDIRECT_URI || `${baseOrigin}/`;
  const state = randomBase64Url(18);
  const nonce = randomBase64Url(18);
  const codeVerifier = randomBase64Url(48);
  const codeChallenge = sha256Base64Url(codeVerifier);
  const jar = new Map();

  const authUrl = new URL(`${baseOrigin}/idp/realms/${encodeURIComponent(realm)}/protocol/openid-connect/auth`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const loginPage = await followRedirects(authUrl.toString(), jar, {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  });

  let currentResponse = loginPage;
  const initialStage = detectPageStage(loginPage.raw);
  if (initialStage === 'username') {
    currentResponse = await submitHtmlForm({
      pageUrl: loginPage.finalUrl,
      html: loginPage.raw,
      overrides: { username },
      jar,
      origin: baseOrigin,
      preferredStage: 'username',
    });
  }

  const passwordStage = detectPageStage(currentResponse.raw);
  if (passwordStage === 'password') {
    currentResponse = await submitHtmlForm({
      pageUrl: currentResponse.finalUrl || currentResponse.url,
      html: currentResponse.raw,
      overrides: { username, password },
      jar,
      origin: baseOrigin,
      preferredStage: 'password',
    });

    // Check if we got redirected to callback
    let location = currentResponse.headers?.location;
    if (location) {
      const nextUrl = buildAbsoluteUrl(currentResponse.url, location);
      const codeFromLocation = extractAuthorizationCode(nextUrl, state);
      if (codeFromLocation) {
        return { code: codeFromLocation, codeVerifier, redirectUri, jar, clientId };
      }
    }
  }

  // OTP stage if needed
  const stage = detectPageStage(currentResponse.raw);
  if (stage === 'otp' && authCode) {
    const otpForm = chooseLoginForm(currentResponse.raw);
    const otpInputs = extractInputs(otpForm?.body || '');
    const otpFieldName =
      Object.keys(otpInputs).find((key) => /^(totp|otp)$/i.test(key)) ||
      Object.keys(otpInputs).find((key) => /otp|code/i.test(key)) ||
      'totp';

    currentResponse = await submitHtmlForm({
      pageUrl: currentResponse.finalUrl || currentResponse.url,
      html: currentResponse.raw,
      overrides: { [otpFieldName]: authCode },
      jar,
      origin: baseOrigin,
      preferredStage: 'otp',
    });
  }

  // Extract code from current response
  const responseUrl = currentResponse.finalUrl || currentResponse.url;
  const code = extractAuthorizationCode(responseUrl, state);
  if (code) {
    return { code, codeVerifier, redirectUri, jar, clientId };
  }

  // Check for redirect
  const location = currentResponse.headers?.location;
  if (location) {
    const nextUrl = buildAbsoluteUrl(currentResponse.url, location);
    const codeFromLocation = extractAuthorizationCode(nextUrl, state);
    if (codeFromLocation) {
      return { code: codeFromLocation, codeVerifier, redirectUri, jar, clientId };
    }
  }

  throw new Error(
    extractHtmlMessage(currentResponse.raw) ||
    extractPageTitle(currentResponse.raw) ||
    'Keycloak login did not return an authorization code'
  );
}

async function exchangeCodeForToken(baseOrigin, browserLogin) {
  const realm = process.env.REMOTE_FETCH_XC1_REALM || DEFAULT_REALM;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: browserLogin.clientId,
    redirect_uri: browserLogin.redirectUri,
    code: browserLogin.code,
    code_verifier: browserLogin.codeVerifier,
  }).toString();

  const response = await requestUrl(
    `${baseOrigin}/idp/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        Origin: baseOrigin,
        Referer: `${baseOrigin}/`,
      },
      body,
      jar: browserLogin.jar,
    }
  );

  if (response.status >= 200 && response.status < 300 && response.json?.access_token) {
    return response.json;
  }

  throw new Error(pickErrorMessage(response, `Keycloak token exchange failed with HTTP ${response.status}`));
}

async function requestDirectPasswordGrantToken({ baseOrigin, username, password, authCode, clientId }) {
  const realm = process.env.REMOTE_FETCH_XC1_REALM || DEFAULT_REALM;
  const formData = {
    grant_type: 'password',
    client_id: clientId || DEFAULT_CLIENT_ID,
    username: String(username || '').trim(),
    password: String(password || ''),
  };
  if (String(authCode || '').trim()) {
    formData.otp = String(authCode).trim();
  }

  const body = new URLSearchParams(formData).toString();
  const response = await requestUrl(
    `${baseOrigin}/idp/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        Origin: baseOrigin,
        Referer: `${baseOrigin}/`,
      },
      body,
    }
  );

  if (response.status >= 200 && response.status < 300 && response.json?.access_token) {
    return response.json;
  }

  throw new Error(pickErrorMessage(response, `Direct password grant failed with HTTP ${response.status}`));
}

async function requestAccessToken({ baseOrigin, username, password, authCode, clientId }) {
  let directError = null;

  // Try direct grant first
  try {
    return await requestDirectPasswordGrantToken({ baseOrigin, username, password, authCode, clientId });
  } catch (error) {
    directError = error;
  }

  // Fallback to browser login + PKCE
  const browserLogin = await completeBrowserLogin({ baseOrigin, username, password, authCode });
  return exchangeCodeForToken(baseOrigin, browserLogin);
}

export async function resolveKeycloakToken({ baseUrl, realm, clientId, username, password, authCode }) {
  const baseOrigin = String(baseUrl).replace(/\/$/, '');
  if (realm) process.env.REMOTE_FETCH_XC1_REALM = realm;
  if (clientId) process.env.REMOTE_FETCH_XC1_CLIENT_ID = clientId;

  try {
    const tokenResponse = await requestAccessToken({
      baseOrigin,
      username,
      password,
      authCode,
      clientId: clientId || DEFAULT_CLIENT_ID,
    });
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      expiresIn: tokenResponse.expires_in || 3600,
      tokenType: tokenResponse.token_type || 'Bearer',
      scope: tokenResponse.scope,
    };
  } finally {
    delete process.env.REMOTE_FETCH_XC1_REALM;
    delete process.env.REMOTE_FETCH_XC1_CLIENT_ID;
  }
}
