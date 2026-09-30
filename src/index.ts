/**
 *
 * Test with curl:
 *   curl http://localhost:3000/id/42
 *   curl "http://localhost:3000/query?q=test"
 *   curl "http://localhost:3000/filters?tag=a&tag=b&limit=10"
 *   curl -X POST http://localhost:3000/ \
 *        -H "Content-Type: application/json" \
 *        -d '{"name":"John Doe"}'
 *
 * Most common HTTP status codes:
 *   200 OK                  successful read (GET)
 *   201 Created             resource created (POST)
 *   204 No Content          success with no body (e.g. DELETE)
 *   400 Bad Request         invalid input sent by the client
 *   401 Unauthorized        authentication is missing
 *   403 Forbidden           authenticated, but not allowed
 *   404 Not Found           resource or route does not exist
 *   500 Internal Error      unexpected server error
 *
 * Golden rule: every handler must RETURN a Response (c.json, c.text,
 * c.html, c.redirect...). A handler that ends without returning (for example,
 * an empty catch) makes Hono throw the "Context is not finalized" error.
 */
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

/* -------------------------------------------------------------------------- */
/* ROUTE PARAMETER                                                            */
/* -------------------------------------------------------------------------- */

/**
 * GET /id/42
 *
 * c.req.param("id") reads the dynamic URL segment, always as a string.
 * The route only matches if the segment exists, so the value is never empty
 * here; the useful validation is about the value's FORMAT.
 *
 * Instead of building the error response in every route, we throw an
 * HTTPException and let app.onError (further below) format everything in
 * one place. That is why each handler does not need its own try/catch.
 *
 * The handler does not use await, so it does not need to be async.
 */
app.get("/id/:id", (c) => {
  const id = c.req.param("id");

  if (!/^\d+$/.test(id)) {
    throw new HTTPException(400, { message: "The id must be numeric." });
  }

  return c.json({ status: "ok", id: Number(id) }, 200);
});

/* -------------------------------------------------------------------------- */
/* QUERY STRING                                                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /query?q=test
 *
 * c.req.query("q") returns string | undefined.
 * Here the check makes sense, because the client may omit the parameter.
 */
app.get("/query", (c) => {
  const q = c.req.query("q");

  if (!q) {
    throw new HTTPException(400, { message: "The 'q' parameter is required." });
  }

  return c.json({ status: "ok", q }, 200);
});

/**
 * GET /filters?tag=a&tag=b&limit=10
 *
 * c.req.query()         -> object with all parameters (last value of each)
 * c.req.queries("tag")  -> array with all repeated values: ["a", "b"]
 *
 * Query values always arrive as strings; convert them when needed.
 */
app.get("/filters", (c) => {
  const all = c.req.query();
  const tags = c.req.queries("tag") ?? [];
  const limit = Number(c.req.query("limit") ?? 20);

  return c.json({ status: "ok", all, tags, limit }, 200);
});

/* -------------------------------------------------------------------------- */
/* REQUEST BODY (JSON)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * POST /
 *
 * c.req.json() THROWS if the body is not valid JSON
 * (that is why try/catch is needed here, unlike the routes above).
 * We turn that error into a 400, since it is the client's fault, not a 500.
 *
 * Other body readers:
 *   await c.req.text()       plain text
 *   await c.req.parseBody()  forms (form-data / x-www-form-urlencoded)
 *
 * To validate fields and get automatic typing, prefer
 * @hono/zod-validator over manual checks.
 */
app.post("/", async (c) => {
  let payload: unknown;

  try {
    payload = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Request body is not valid JSON." });
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new HTTPException(400, { message: "The body must be a JSON object." });
  }

  return c.json({ status: "ok", data: payload }, 201);
});

/* -------------------------------------------------------------------------- */
/* HEADERS                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /headers
 *
 * c.req.header("name")  reads a request header (case-insensitive)
 * c.header("name", "v") sets a response header
 */
app.get("/headers", (c) => {
  const userAgent = c.req.header("user-agent") ?? "unknown";
  c.header("X-Example", "hono");

  return c.json({ status: "ok", userAgent }, 200);
});

/* -------------------------------------------------------------------------- */
/* CENTRALIZED ERROR HANDLING                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Catches any error thrown in routes or middlewares.
 * HTTPException -> expected error, returns the defined status and message.
 * Anything else -> unexpected error, logs it and returns a generic 500
 * (never expose internal details to the client).
 */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ status: "error", details: err.message }, err.status);
  }

  console.error(err);
  return c.json({ status: "error", details: "Internal server error." }, 500);
});

/**
 * Response for routes that do not exist.
 * Without this, Hono returns a plain-text 404.
 */
app.notFound((c) => {
  return c.json({ status: "error", details: `Route not found: ${c.req.path}` }, 404);
});

/**
 * Bun recognizes a default export with a fetch method as a server.
 * To change the port:
 *   export default { port: 8080, fetch: app.fetch };
 */
export default app;