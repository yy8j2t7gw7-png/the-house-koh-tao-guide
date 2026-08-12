import {
  conciergeStatus,
  handleAdminRequest,
  handleConciergeRequest,
  handleFeedbackRequest
} from "./concierge-api.js";
import { cleanupPassportUploads, handlePassportGuestRequest } from "./passport-api.js";
import { handleTranslationRequest } from "./i18n-api.js";
export { ConciergeStore } from "./concierge-store.js";

const EXPLORE_PAGE_PATTERN = /^\/(?:explore|activities|activity|diving|bars|bar|beaches|beach|cafes|cafe|restaurants|restaurant|shopping|shop)(?:\.html)?\/?$/;
const EXPLORE_MODULE_PATTERN = /^\/modules\/(?:explore|activities|diving|bars|beaches|cafes|restaurants|shopping)\//;

function exploreEnabled(env) {
  return String(env.EXPLORE_ENABLED || "").toLowerCase() === "true";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
      "x-content-type-options": "nosniff"
    }
  });
}

function withoutExploreNavigation(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;
  return new HTMLRewriter()
    .on('.nav a[href="/explore.html"],a.card[href="/explore.html"]', {
      element(element) { element.remove(); }
    })
    .transform(response);
}

async function privateAsset(request, env, path) {
  const assetUrl = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    method: "GET",
    headers: request.headers
  }));
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("content-security-policy", "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("permissions-policy", "camera=(self), microphone=(), geolocation=()");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/features" && request.method === "GET") {
      return json({ exploreEnabled: exploreEnabled(env) });
    }

    if (url.pathname === "/api/concierge/status" && request.method === "GET") {
      return conciergeStatus(env);
    }

    if (url.pathname === "/api/concierge") {
      return handleConciergeRequest(request, env, ctx);
    }

    if (url.pathname === "/api/concierge/feedback") {
      return handleFeedbackRequest(request, env);
    }

    if (url.pathname === "/api/i18n/translate") {
      return handleTranslationRequest(request, env);
    }

    if (url.pathname === "/api/passport-upload" || url.pathname === "/api/passport-upload/session") {
      return handlePassportGuestRequest(request, env, url.pathname);
    }

    if (url.pathname.startsWith("/api/concierge/admin/")) {
      return handleAdminRequest(request, env, url.pathname);
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      });
    }

    if (!exploreEnabled(env) && (EXPLORE_PAGE_PATTERN.test(url.pathname) || EXPLORE_MODULE_PATTERN.test(url.pathname))) {
      return Response.redirect(new URL("/", request.url).toString(), 302);
    }

    if (/^\/room\/(1|2|3|4|5|6|7|8|9|10|11)\/?$/.test(url.pathname)) {
      const roomPageUrl = new URL("/room.html", url);
      const assetRequest = new Request(roomPageUrl.toString(), {
        method: "GET",
        headers: request.headers,
      });
      const response = await env.ASSETS.fetch(assetRequest);
      return exploreEnabled(env) ? response : withoutExploreNavigation(response);
    }

    if (url.pathname === "/room" || url.pathname === "/room/") {
      const selectorUrl = new URL("/rooms.html", url);
      const assetRequest = new Request(selectorUrl.toString(), {
        method: "GET",
        headers: request.headers,
      });
      const response = await env.ASSETS.fetch(assetRequest);
      return exploreEnabled(env) ? response : withoutExploreNavigation(response);
    }

    if (url.pathname === "/concierge-admin" || url.pathname === "/concierge-admin/" || url.pathname === "/concierge-admin.html") {
      return privateAsset(request, env, "/concierge-admin.html");
    }

    if (url.pathname === "/passport-upload" || url.pathname === "/passport-upload/" || url.pathname === "/passport-upload.html") {
      return privateAsset(request, env, "/passport-upload.html");
    }

    const response = await env.ASSETS.fetch(request);
    return exploreEnabled(env) ? response : withoutExploreNavigation(response);
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(cleanupPassportUploads(env));
  }
};
