/**
 * Call the fragments microservice from the browser.
 * CRA only exposes env vars prefixed with REACT_APP_.
 */

const fragmentsBaseUrl =
  (process.env.REACT_APP_FRAGMENTS_API_URL || '').replace(/\/$/, '') ||
  'http://localhost:8080';

/**
 * @param {{ authorizationHeaders: (contentType?: string) => Record<string, string> }} user
 */
export async function getUserFragments(user) {
  const fragmentsUrl = new URL('/v1/fragments', `${fragmentsBaseUrl}/`);
  const res = await fetch(fragmentsUrl, {
    headers: user.authorizationHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  return res.json();
}
