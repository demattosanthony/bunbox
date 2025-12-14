/**
 * Middleware utilities for bunbox
 */

/**
 * Create a redirect response
 * @param url - URL to redirect to
 * @param status - HTTP status code (default: 302)
 */
export function redirect(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

/**
 * Parse cookies from a request
 * @param request - The incoming request
 */
export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split("=");
    const value = valueParts.join("="); // Handle values with = in them
    if (key && value) {
      cookies[key.trim()] = decodeURIComponent(value.trim());
    }
  }

  return cookies;
}

/**
 * Get a specific cookie value from a request
 * @param request - The incoming request
 * @param name - Cookie name
 */
export function getCookie(request: Request, name: string): string | undefined {
  const cookies = parseCookies(request);
  return cookies[name];
}

/**
 * Options for setting a cookie
 */
export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Create a Set-Cookie header value
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function createSetCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options.expires) {
    cookie += `; Expires=${options.expires.toUTCString()}`;
  }

  if (options.path) {
    cookie += `; Path=${options.path}`;
  }

  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options.secure) {
    cookie += "; Secure";
  }

  if (options.httpOnly) {
    cookie += "; HttpOnly";
  }

  if (options.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  return cookie;
}

/**
 * Create a response with a cookie set
 * Use this to set cookies in middleware responses
 * @param response - Base response (or null for redirect-only)
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setCookie(
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {}
): Response {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", createSetCookie(name, value, options));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Delete a cookie by setting it to expire immediately
 * @param response - Base response
 * @param name - Cookie name
 * @param options - Cookie options (path and domain should match the original cookie)
 */
export function deleteCookie(
  response: Response,
  name: string,
  options: Omit<CookieOptions, "maxAge" | "expires"> = {}
): Response {
  return setCookie(response, name, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}
