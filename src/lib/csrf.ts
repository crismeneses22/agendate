let csrfToken = "";

export function getCsrfToken() {
  return csrfToken;
}

export function updateCsrfTokenFromResponse(response: Response) {
  const token = response.headers.get("X-CSRF-Token");
  if (token) csrfToken = token;
}

export function withCsrfHeaders(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  return { ...init, headers };
}
