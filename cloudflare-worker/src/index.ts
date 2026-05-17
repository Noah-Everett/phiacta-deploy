import { renderDown } from "./responses";

// Statuses that mean "Cloudflare or the origin/tunnel can't serve right now"
// rather than a legitimate application error. Genuine 500s from FastAPI
// propagate so the client sees the real failure mode.
//
//   502 / 503 / 504        — standard gateway-style errors
//   520..527               — Cloudflare-generated origin/SSL errors
//   530                    — Cloudflare tunnel error (1033 page)
const ORIGIN_DOWN_STATUSES = new Set([
  502, 503, 504,
  520, 521, 522, 523, 524, 525, 526, 527,
  530,
]);

export default {
  async fetch(request: Request): Promise<Response> {
    const isApi = new URL(request.url).hostname === "api.phiacta.com";

    let response: Response;
    try {
      response = await fetch(request);
    } catch {
      return renderDown({ request, isApi });
    }

    if (ORIGIN_DOWN_STATUSES.has(response.status)) {
      return renderDown({ request, isApi });
    }

    return response;
  },
} satisfies ExportedHandler;
