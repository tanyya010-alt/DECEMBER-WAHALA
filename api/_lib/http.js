// Small helpers shared by every API route.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
    return req.body || {};
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 300000) throw new HttpError(413, "Request is too large.");
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

// Wraps a route: method check, JSON-only writes (blocks cross-site form posts),
// and consistent error responses.
function route(methods, fn) {
  return async (req, res) => {
    try {
      if (!methods[req.method]) throw new HttpError(405, "Method not allowed.");
      let body = {};
      if (req.method !== "GET") {
        const type = String(req.headers["content-type"] || "");
        if (!type.includes("application/json")) throw new HttpError(415, "Send JSON.");
        try { body = await readBody(req); } catch (e) { throw e instanceof HttpError ? e : new HttpError(400, "Invalid JSON."); }
      }
      const query = Object.fromEntries(new URL(req.url, "http://x").searchParams);
      await methods[req.method]({ req, res, body, query });
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: "Something went wrong on our side. Try again." });
    }
  };
}

module.exports = { HttpError, send, route };
