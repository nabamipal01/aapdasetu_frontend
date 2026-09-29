import API_BASE_URL from "../config/Config";

/**
 * Safely attempt to parse text as JSON.
 * Returns parsed object on success, null on failure.
 */
function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper.
 * - Automatically attaches Authorization header when a token exists in localStorage.
 * - Safely parses responses: always reads as text first, then tries JSON.
 *   This prevents crashes when the server returns an HTML error page
 *   (e.g. PHP fatal errors with <br /> tags) instead of valid JSON.
 * - Normalises all errors into thrown Error objects with .status and .data.
 *
 * @param {string} endpoint  — path relative to API_BASE_URL, e.g. "/api/auth/login.php"
 * @param {RequestInit} options — standard fetch options (method, body, headers, …)
 * @returns {Promise<any>} — parsed JSON body
 */
async function apiFetch(endpoint, options = {}) {
  const storedToken = localStorage.getItem("token");
  const token = storedToken && storedToken !== "null" && storedToken !== "undefined"
    ? storedToken.trim()
    : "";
  const isPublicEndpoint = endpoint.includes("/api/auth/login.php") || endpoint.includes("/api/auth/register.php");

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  if (token && !isPublicEndpoint) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (networkErr) {
    // Network failure (server unreachable, CORS preflight blocked, etc.)
    const err = new Error(networkErr.message || "Network error — cannot reach server");
    err.status = 0;
    throw err;
  }

  // Always read as text first — never let response.json() throw on HTML pages
  const rawText = await response.text();

  // Try to parse as JSON regardless of Content-Type header.
  // PHP error pages send text/html but may also accidentally include a
  // json Content-Type if output buffering partially flushed headers.
  const data = tryParseJSON(rawText);

  if (!response.ok) {
    if (response.status === 401 && !isPublicEndpoint && typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:expired"));
    }

    // Build the most useful error message available
    const message =
      (data && data.message) ||
      (rawText && rawText.trim().length < 300 ? rawText.trim() : null) ||
      `Server error (${response.status})`;

    const err = new Error(message);
    err.status = response.status;
    err.data = data ?? rawText;
    throw err;
  }

  // Success path — if we couldn't parse JSON, the server returned something
  // unexpected (HTML error page with 200 status — common with PHP warnings).
  if (data === null) {
    // Truncate the HTML to give a readable hint
    const preview = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    const err = new Error(`Server returned non-JSON response: ${preview}`);
    err.status = response.status;
    err.data = rawText;
    throw err;
  }

  return data;
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

export const get = (endpoint, params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const url = query ? `${endpoint}?${query}` : endpoint;
  return apiFetch(url, { method: "GET" });
};

export const post = (endpoint, body) =>
  apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });

export const patch = (endpoint, body) =>
  apiFetch(endpoint, { method: "PATCH", body: JSON.stringify(body) });

export const put = (endpoint, body) =>
  apiFetch(endpoint, { method: "PUT", body: JSON.stringify(body) });

export const del = (endpoint) =>
  apiFetch(endpoint, { method: "DELETE" });

export default apiFetch;
