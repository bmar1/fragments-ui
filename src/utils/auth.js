/**
 * AWS Cognito User Pool — OIDC authorization code + PKCE (oidc-client-ts).
 * Same OAuth shape as the original setup: cognito-idp issuer + scopes you enable on the app client.
 *
 * Env (CRA requires REACT_APP_*):
 *   REACT_APP_COGNITO_USER_POOL_ID, REACT_APP_COGNITO_CLIENT_ID
 *   REACT_APP_COGNITO_REDIRECT_URI — fallback when `window` is missing (tests); in the browser the
 *   actual redirect_uri is always `window.location.origin` so it matches the URL Cognito returns to
 *   (avoids invalid_grant when PORT differs from .env).
 * Optional: REACT_APP_COGNITO_SCOPE — defaults to "phone openid email" (original).
 *
 * If you see ?error=invalid_request&error_description=invalid_scope: every scope in the request
 * must be checked under Cognito → App client → Hosted UI → OpenID Connect scopes (or use a smaller
 * REACT_APP_COGNITO_SCOPE, e.g. "openid email").
 *
 * React 18 Strict Mode runs effects twice in dev; without guarding, two parallel `signinCallback`
 * calls reuse the same ?code= and the second POST to /oauth2/token fails with invalid_grant.
 */

import { UserManager } from 'oidc-client-ts';

/* global window, document */

/** @type {UserManager | null} */
let userManager = null;
/** @type {string | null} */
let userManagerScopeKey = null;

/** Single in-flight OAuth code exchange (Strict Mode / concurrent getSession). */
let signinCodeExchangePromise = null;

/** Original default — match App client “Allowed OAuth scopes” in the console. */
const DEFAULT_COGNITO_SCOPE = 'phone openid email';

/** Cognito often uses an opaque UUID for `cognito:username`; avoid showing that or `sub` when we have a real name or email. */
function isUuidLike(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  );
}

/** @returns {Record<string, unknown>} */
function decodeIdTokenPayload(idToken) {
  if (!idToken || typeof idToken !== 'string') return {};
  const parts = idToken.split('.');
  if (parts.length < 2) return {};
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, unknown>} claims merged profile + ID token (+ optional UserInfo) claims
 */
function pickDisplayUsername(claims) {
  const name =
    (typeof claims.name === 'string' && claims.name.trim()) ||
    [
      typeof claims.given_name === 'string' ? claims.given_name.trim() : '',
      typeof claims.family_name === 'string' ? claims.family_name.trim() : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    (typeof claims.nickname === 'string' && claims.nickname.trim());
  if (name) return name;

  if (typeof claims.email === 'string' && claims.email.includes('@')) {
    const local = claims.email.split('@')[0].trim();
    if (local) return local;
  }

  const cognitoUser = claims['cognito:username'];
  if (typeof cognitoUser === 'string' && cognitoUser.trim() && !isUuidLike(cognitoUser)) {
    return cognitoUser.trim();
  }

  // UserInfo endpoint often exposes `username` (distinct from cognito:username)
  const userInfoUsername = claims.username;
  if (
    typeof userInfoUsername === 'string' &&
    userInfoUsername.trim() &&
    !isUuidLike(userInfoUsername)
  ) {
    return userInfoUsername.trim();
  }

  const preferred = claims.preferred_username;
  if (typeof preferred === 'string' && preferred.trim() && !isUuidLike(preferred)) {
    return preferred.trim();
  }

  if (typeof claims.phone_number === 'string' && claims.phone_number.trim()) {
    return claims.phone_number.trim();
  }

  if (typeof claims.email === 'string' && claims.email.trim()) {
    return claims.email.trim();
  }

  if (typeof claims.sub === 'string' && claims.sub.length >= 8) {
    return `User (${claims.sub.slice(0, 8)}…)`;
  }

  return 'User';
}

export function cognitoIssuerUrl(userPoolId) {
  if (!userPoolId || typeof userPoolId !== 'string' || !userPoolId.includes('_')) {
    throw new Error(
      'REACT_APP_COGNITO_USER_POOL_ID must include the region prefix, e.g. us-east-2_AbCdEfGh'
    );
  }
  const region = userPoolId.split('_')[0];
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

/**
 * Callback and sign-out URLs must exactly match entries in the Cognito app client
 * (Allowed callback URLs / Allowed sign-out URLs). In the browser we use the current origin
 * so the port and host match the running dev server.
 */
function resolveRedirectUris() {
  const envRedirect = (process.env.REACT_APP_COGNITO_REDIRECT_URI || '').trim();
  const envLogout = (process.env.REACT_APP_COGNITO_LOGOUT_REDIRECT_URI || '').trim();

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    return {
      redirectUri: origin,
      logoutRedirectUri: envLogout || origin,
    };
  }

  if (!envRedirect) {
    throw new Error(
      'Set REACT_APP_COGNITO_REDIRECT_URI in .env (required when window is unavailable, e.g. some tests).'
    );
  }

  return {
    redirectUri: envRedirect,
    logoutRedirectUri: envLogout || envRedirect,
  };
}

function readEnv() {
  const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const { redirectUri, logoutRedirectUri } = resolveRedirectUris();

  if (!userPoolId || !clientId) {
    throw new Error(
      'Set REACT_APP_COGNITO_USER_POOL_ID and REACT_APP_COGNITO_CLIENT_ID in .env (CRA requires the REACT_APP_ prefix).'
    );
  }

  const scope =
    (process.env.REACT_APP_COGNITO_SCOPE || '').trim() || DEFAULT_COGNITO_SCOPE;

  return {
    userPoolId,
    clientId,
    redirectUri,
    scope,
    hostedUiDomain: process.env.REACT_APP_COGNITO_HOSTED_UI_DOMAIN?.replace(
      /\/$/,
      ''
    ),
    logoutRedirectUri,
  };
}

export function getUserManager() {
  const env = readEnv();
  const scopeKey = `${env.clientId}|${env.redirectUri}|${env.scope}|${env.userPoolId}`;

  if (!userManager || userManagerScopeKey !== scopeKey) {
    userManager = new UserManager({
      authority: cognitoIssuerUrl(env.userPoolId),
      client_id: env.clientId,
      redirect_uri: env.redirectUri,
      response_type: 'code',
      scope: env.scope,
      // Merge OpenID UserInfo (adds `username`, etc.) when the ID token is sparse
      loadUserInfo: true,
      automaticSilentRenew: false,
      revokeTokenTypes: ['refresh_token'],
    });
    userManagerScopeKey = scopeKey;
  }
  return userManager;
}

/** Hosted UI authorize redirect */
export async function signIn() {
  await getUserManager().signinRedirect();
}

/**
 * Clear local session. If Hosted UI domain + logout URI are set, redirects to Cognito logout.
 * @returns {Promise<boolean>} true if navigating away to Cognito logout
 */
export async function signOut() {
  const env = readEnv();
  const mgr = getUserManager();
  await mgr.removeUser();

  if (env.hostedUiDomain && env.logoutRedirectUri) {
    const params = new URLSearchParams({
      client_id: env.clientId,
      logout_uri: env.logoutRedirectUri,
    });
    window.location.assign(`${env.hostedUiDomain}/logout?${params}`);
    return true;
  }
  return false;
}

function formatUser(user) {
  const profile = user.profile || {};
  const idClaims = decodeIdTokenPayload(user.id_token);
  const merged = { ...idClaims, ...profile };
  const username = pickDisplayUsername(merged);
  const email =
    typeof merged.email === 'string' ? merged.email : undefined;

  return {
    username,
    email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (contentType = 'application/json') => ({
      'Content-Type': contentType,
      // fragments API verifies Cognito *identity* tokens (tokenUse: 'id'), not access tokens
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

function consumeOAuthErrorQuery() {
  const search = window.location.search || '';
  if (!search.includes('error=')) return null;

  const params = new URLSearchParams(search);
  const error = params.get('error');
  const description = params.get('error_description') || '';

  window.history.replaceState({}, document.title, window.location.pathname);

  return {
    error: error || 'oauth_error',
    description: description.replace(/\+/g, ' '),
  };
}

async function loadUserAfterOAuthHandling(mgr) {
  const search = window.location.search || '';

  if (/\bcode=/.test(search)) {
    if (!signinCodeExchangePromise) {
      signinCodeExchangePromise = (async () => {
        try {
          const signedIn = await mgr.signinCallback(window.location.href);
          window.history.replaceState({}, document.title, window.location.pathname);
          return signedIn ? formatUser(signedIn) : null;
        } catch (err) {
          console.error('Cognito sign-in callback failed', err);
          return null;
        } finally {
          signinCodeExchangePromise = null;
        }
      })();
    }
    return signinCodeExchangePromise;
  }

  const stored = await mgr.getUser();
  return stored ? formatUser(stored) : null;
}

/**
 * Bootstrap: clears Cognito error query params, completes code exchange, or restores user.
 * @returns {{ user: ReturnType<typeof formatUser> | null, oauthError?: { error: string, description: string } }}
 */
export async function getSession() {
  const oauthErr = consumeOAuthErrorQuery();
  if (oauthErr) {
    console.error(
      '[Fragments] Cognito OAuth error:',
      oauthErr.error,
      oauthErr.description
    );
    return { user: null, oauthError: oauthErr };
  }

  const mgr = getUserManager();
  const user = await loadUserAfterOAuthHandling(mgr);
  return { user };
}

export async function getUser() {
  const { user } = await getSession();
  return user;
}
