const PUBLIC_ORIGINS = new Set([
  "https://orbelabz.github.io",
  "https://orbelabz.com",
  "https://www.orbelabz.com",
]);

export function apiResponse(request: Request, value: unknown, status = 200) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  const origin = request.headers.get("Origin");
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
  return status === 204 ? new Response(null, { status, headers }) : Response.json(value, { status, headers });
}
