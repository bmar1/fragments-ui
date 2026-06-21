/**
 * Call the fragments microservice from the browser.
 * CRA only exposes env vars prefixed with REACT_APP_*.
 */

const fragmentsBaseUrl =
  (process.env.REACT_APP_FRAGMENTS_API_URL || '').replace(/\/$/, '') ||
  'http://localhost:8080';

export const FRAGMENT_TYPES = [
  { value: 'text/plain', label: 'Plain text (text/plain)' },
  { value: 'text/markdown', label: 'Markdown (text/markdown)' },
  { value: 'application/json', label: 'JSON (application/json)' },
];

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

/**
 * List fragments for the signed-in user (metadata when expand=1).
 * @param {{ authorizationHeaders: (contentType?: string) => Record<string, string> }} user
 */
export async function getUserFragments(user) {
  const fragmentsUrl = new URL('/v1/fragments', `${fragmentsBaseUrl}/`);
  fragmentsUrl.searchParams.set('expand', '1');
  const res = await apiFetch(fragmentsUrl, {
    headers: user.authorizationHeaders(),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  return res.json();
}

/**
 * Create a fragment with the given content type and body.
 * @param {{ authorizationHeaders: (contentType?: string) => Record<string, string> }} user
 * @param {string} contentType
 * @param {string} body
 */
export async function createFragment(user, contentType, body) {
  const fragmentsUrl = new URL('/v1/fragments', `${fragmentsBaseUrl}/`);
  const res = await apiFetch(fragmentsUrl, {
    method: 'POST',
    headers: user.authorizationHeaders(contentType),
    body,
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
