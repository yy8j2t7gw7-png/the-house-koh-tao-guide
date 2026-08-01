export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (/^\/room\/(1|2|3|4|5|6|8|9|10|11)\/?$/.test(url.pathname)) {
      const roomPageUrl = new URL("/room.html", url);
      const assetRequest = new Request(roomPageUrl.toString(), {
        method: "GET",
        headers: request.headers,
      });
      return env.ASSETS.fetch(assetRequest);
    }

    if (url.pathname === "/room" || url.pathname === "/room/") {
      const selectorUrl = new URL("/rooms.html", url);
      const assetRequest = new Request(selectorUrl.toString(), {
        method: "GET",
        headers: request.headers,
      });
      return env.ASSETS.fetch(assetRequest);
    }

    return env.ASSETS.fetch(request);
  },
};
