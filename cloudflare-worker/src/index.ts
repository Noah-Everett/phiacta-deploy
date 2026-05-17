import { renderDown } from "./responses";

// Statuses that mean "origin can't serve right now" rather than a legitimate
// application error. Genuine 500s from FastAPI propagate so the client sees the
// real failure mode.
const ORIGIN_DOWN_STATUSES = new Set([502, 503, 504]);

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
