import { describe, expect, it } from "vitest";
import { renderDown, renderDownHtml, renderDownJson } from "../src/responses";

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe("renderDownHtml", () => {
  it("uses the web headline outside the API hostname", () => {
    const html = renderDownHtml({ isApi: false });
    expect(html).toContain("Phiacta is briefly offline");
    expect(html).toContain("Try again");
  });

  it("uses the API headline when isApi is true", () => {
    const html = renderDownHtml({ isApi: true });
    expect(html).toContain("Phiacta API is offline");
    expect(html).toContain("Open phiacta.com");
  });

  it("includes a contact mailto for both variants", () => {
    for (const isApi of [false, true]) {
      const html = renderDownHtml({ isApi });
      expect(html).toContain("mailto:contact@phiacta.com");
      expect(html).toContain("contact@phiacta.com");
    }
  });
});

describe("renderDownJson", () => {
  it("is a stable shape", () => {
    expect(JSON.parse(renderDownJson())).toEqual({
      error: "service_unavailable",
      message:
        "The Phiacta API is temporarily unreachable. Please retry shortly.",
      retry_after_seconds: 30,
    });
  });
});

describe("renderDown — web", () => {
  it("returns a 503 HTML response", async () => {
    const response = renderDown({
      request: makeRequest("https://phiacta.com/explore"),
      isApi: false,
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toContain("Phiacta is briefly offline");
  });
});

describe("renderDown — api", () => {
  it("returns JSON by default", async () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries"),
      isApi: true,
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = await response.json();
    expect(body).toMatchObject({ error: "service_unavailable" });
  });

  it("returns HTML when Accept negotiates text/html and not application/json", async () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries", {
        headers: { Accept: "text/html" },
      }),
      isApi: true,
    });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain("Phiacta API is offline");
  });

  it("returns JSON when Accept contains both html and json (API tooling case)", async () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries", {
        headers: { Accept: "text/html, application/json" },
      }),
      isApi: true,
    });
    expect(response.headers.get("Content-Type")).toContain("application/json");
  });

  it("sets CORS headers for phiacta.com origins", () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries", {
        headers: { Origin: "https://phiacta.com" },
      }),
      isApi: true,
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://phiacta.com",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
  });

  it("does not set CORS headers for unknown origins", () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries", {
        headers: { Origin: "https://evil.example" },
      }),
      isApi: true,
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("answers OPTIONS preflight with 204 and allowed methods/headers", () => {
    const response = renderDown({
      request: makeRequest("https://api.phiacta.com/entries", {
        method: "OPTIONS",
        headers: {
          Origin: "https://phiacta.com",
          "Access-Control-Request-Headers": "authorization, content-type",
        },
      }),
      isApi: true,
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "GET",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "authorization",
    );
    expect(response.headers.get("Access-Control-Max-Age")).toBe("600");
  });
});
