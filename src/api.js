/**
 * Call the fragments microservice from the browser.
 * CRA only exposes env vars prefixed with REACT_APP_*.
 *
 * Set REACT_APP_FRAGMENTS_API_URL to your API (localhost or EC2), e.g.:
 *   http://ec2-xx-xx-xx-xx.compute-1.amazonaws.com:8080
 */

const fragmentsBaseUrl =
  (process.env.REACT_APP_FRAGMENTS_API_URL || '').replace(/\/$/, '') ||
  'http://localhost:8080';

async function parseErrorResponse(res) {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json?.error?.message) {
      return `${res.status} ${json.error.message}`;
    }
  } catch {
    /* not JSON */
  }
  return `${res.status} ${res.statusText}${text ? `: ${text}` : ''}`;
}

/**
 * @param {{ authorizationHeaders: (contentType?: string) => Record<string, string> }} user
 */
async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const hint = `Cannot reach API at ${fragmentsBaseUrl}. Check REACT_APP_FRAGMENTS_API_URL, EC2 security group (port 8080), and that the server is running.`;
    throw new Error(err instanceof Error ? `${err.message} — ${hint}` : hint);
  }
}

export async function getUserFragments(user) {
  const fragmentsUrl = new URL('/v1/fragments', `${fragmentsBaseUrl}/`);
  const res = await apiFetch(fragmentsUrl, {
    headers: user.authorizationHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
}

/**
 * Create a plain text fragment.
 * @param {{ authorizationHeaders: (contentType?: string) => Record<string, string> }} user
 * @param {string} text
 * @returns {Promise<{ data: object, location: string | null }>}
 */
export async function createFragment(user, text) {
  const fragmentsUrl = new URL('/v1/fragments', `${fragmentsBaseUrl}/`);
  const res = await apiFetch(fragmentsUrl, {
    method: 'POST',
    headers: user.authorizationHeaders('text/plain'),
    body: text,
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const data = await res.json();
  return {
    data,
    location: res.headers.get('Location'),
  };
}

export function getFragmentsApiUrl() {
  return fragmentsBaseUrl;
}
