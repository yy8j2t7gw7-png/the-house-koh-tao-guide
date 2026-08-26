const PUBLIC_LEGAL_PAGES = new Map([
  ["/privacy", "/privacy.html"],
  ["/privacy/", "/privacy.html"],
  ["/privacy.html", "/privacy.html"],
  ["/data-deletion", "/data-deletion.html"],
  ["/data-deletion/", "/data-deletion.html"],
  ["/data-deletion.html", "/data-deletion.html"],
  ["/terms", "/terms.html"],
  ["/terms/", "/terms.html"],
  ["/terms.html", "/terms.html"]
]);

export async function servePublicLegalPage(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = PUBLIC_LEGAL_PAGES.get(new URL(request.url).pathname);
  if (!path) return null;

  const assetUrl = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: request.method,
    headers: request.headers
  }));
  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=300");
  headers.set("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
}
