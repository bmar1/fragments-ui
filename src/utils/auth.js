/**
 * AWS Cognito User Pool — OIDC authorization code + PKCE (oidc-client-ts).
 * Same OAuth shape as the original setup: cognito-idp issuer + scopes you enable on the app client.
 *
 * Env (CRA requires REACT_APP_*):
 *   REACT_APP_COGNITO_USER_POOL_ID, REACT_APP_COGNITO_CLIENT_ID, REACT_APP_COGNITO_REDIRECT_URI
 * Optional: REACT_APP_COGNITO_SCOPE — defaults to "phone openid email" (original).
 *
 * If you see ?error=invalid_request&error_description=invalid_scope: every scope in the request
 * must be checked under Cognito → App client → Hosted UI → OpenID Connect scopes (or use a smaller
 * REACT_APP_COGNITO_SCOPE, e.g. "openid email").
 */

import { UserManager } from 'oidc-client-ts';

/* global window, document */

/** @type {UserManager | null} */
let userManager = null;
/** @type {string | null} */
let userManagerScopeKey = null;

/** Original default — match App client “Allowed OAuth scopes” in the console. */
const DEFAULT_COGNITO_SCOPE = 'phone openid email';

export function cognitoIssuerUrl(userPoolId) {
  if (!userPoolId || typeof userPoolId !== 'string' || !userPoolId.includes('_')) {
    throw new Error(
      'REACT_APP_COGNITO_USER_POOL_ID must include the region prefix, e.g. us-east-2_AbCdEfGh'
    );
  }
  const region = userPoolId.split('_')[0];
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

function readEnv() {
  const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID;
  const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_COGNITO_REDIRECT_URI;

  if (!userPoolId || !clientId || !redirectUri) {
    throw new Error(
      'Set REACT_APP_COGNITO_USER_POOL_ID, REACT_APP_COGNITO_CLIENT_ID, and REACT_APP_COGNITO_REDIRECT_URI in .env (CRA requires the REACT_APP_ prefix).'
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
    logoutRedirectUri: process.env.REACT_APP_COGNITO_LOGOUT_REDIRECT_URI,
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
  const username =
    profile['cognito:username'] ||
    profile.preferred_username ||
    (typeof profile.email === 'string' ? profile.email.split('@')[0] : null) ||
    profile.sub;

  return {
    username,
    email: profile.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (contentType = 'application/json') => ({
      'Content-Type': contentType,
      Authorization: `Bearer ${user.access_token}`,
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
    try {
      const signedIn = await mgr.signinCallback(window.location.href);
      window.history.replaceState({}, document.title, window.location.pathname);
      return signedIn ? formatUser(signedIn) : null;
    } catch (err) {
      console.error('Cognito sign-in callback failed', err);
      return null;
    }
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
