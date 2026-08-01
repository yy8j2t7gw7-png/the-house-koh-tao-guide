export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Clean room URLs such as /room/1, /room/2, etc.
    if (/^\/room\/(1|2|3|4|5|6|8|9|10|11)\/?$/.test(url.pathname)) {
      const assetUrl = new URL("/room.html", url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    // Optional convenience route.
    if (url.pathname === "/room" || url.pathname === "/room/") {
      const assetUrl = new URL("/rooms.html", url.origin);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
