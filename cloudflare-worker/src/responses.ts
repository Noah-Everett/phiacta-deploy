// Builds the response served when the origin is unreachable. Split out from
// the fetch handler so it can be unit-tested without mocking subrequests.

const ALLOWED_ORIGIN_PATTERN = /^https:\/\/(?:[a-z0-9-]+\.)?phiacta\.com$/i;

export interface RenderInput {
  request: Request;
  isApi: boolean;
}

export function renderDown({ request, isApi }: RenderInput): Response {
  if (isApi) {
    return renderApiDown(request);
  }
  return renderWebDown();
}

function renderApiDown(request: Request): Response {
  const headers = baseDownHeaders();
  applyCors(headers, request);

  if (request.method === "OPTIONS") {
    const requested = request.headers.get("Access-Control-Request-Headers");
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    if (requested) headers.set("Access-Control-Allow-Headers", requested);
    headers.set("Access-Control-Max-Age", "600");
    return new Response(null, { status: 204, headers });
  }

  const accept = request.headers.get("Accept") ?? "";
  const wantsHtml =
    accept.includes("text/html") && !accept.includes("application/json");

  if (wantsHtml) {
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response(renderDownHtml({ isApi: true }), {
      status: 503,
      headers,
    });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(renderDownJson(), { status: 503, headers });
}

function renderWebDown(): Response {
  return new Response(renderDownHtml({ isApi: false }), {
    status: 503,
    headers: baseDownHeaders({
      "Content-Type": "text/html; charset=utf-8",
    }),
  });
}

function baseDownHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "Retry-After": "30",
    Vary: "Accept, Origin",
    ...extra,
  });
}

function applyCors(headers: Headers, request: Request): void {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGIN_PATTERN.test(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
}

export function renderDownJson(): string {
  return JSON.stringify({
    error: "service_unavailable",
    message:
      "The Phiacta API is temporarily unreachable. Please retry shortly.",
    retry_after_seconds: 30,
  });
}

export function renderDownHtml({ isApi }: { isApi: boolean }): string {
  const headline = isApi
    ? "Phiacta API is offline"
    : "Phiacta is briefly offline";
  const subtitle = isApi
    ? "We couldn't reach the Phiacta API. Please retry in a moment."
    : "We couldn't reach the Phiacta servers. Please try again in a moment.";
  const primary = isApi
    ? `<a class="btn primary" href="https://phiacta.com">Open phiacta.com</a>`
    : `<a class="btn primary" href="" onclick="event.preventDefault(); location.reload();">Try again</a>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${headline} — Phiacta</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,${encodeURIComponent(FAVICON_SVG)}">
<style>${PAGE_CSS}</style>
</head>
<body>
<main class="card">
${LOGO_SVG}
<h1>${headline}</h1>
<p>${subtitle}</p>
<p class="contact">Phiacta is self-hosted, so the occasional hiccup comes with the territory. If it's been a while, drop a line to <a href="mailto:contact@phiacta.com">contact@phiacta.com</a>.</p>
<div class="actions">${primary}<a class="btn" href="https://phiacta.com">Home</a></div>
<div class="status">HTTP 503 · Service Unavailable</div>
</main>
</body>
</html>`;
}

const PAGE_CSS = `
:root {
  color-scheme: light dark;
  --bg: #fafafa;
  --fg: #1e293b;
  --muted: #64748b;
  --card: #ffffff;
  --border: rgba(30, 41, 59, 0.10);
  --accent: #3b82f6;
  --logo-fg: #1e293b;
  --logo-accent: #3b82f6;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1220;
    --fg: #f1f5f9;
    --muted: #94a3b8;
    --card: #111a2e;
    --border: rgba(255, 255, 255, 0.10);
    --logo-fg: #f1f5f9;
  }
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.card {
  max-width: 28rem;
  width: 100%;
  text-align: center;
}
.logo { display: block; margin: 0 auto 1.5rem; width: 96px; height: 96px; }
.logo .fg-stroke { stroke: var(--logo-fg); }
.logo .fg-fill { fill: var(--logo-fg); }
.logo .accent-stroke { stroke: var(--logo-accent); }
.logo .accent-fill { fill: var(--logo-accent); }
h1 {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 0.5rem;
}
p {
  color: var(--muted);
  margin: 0 0 1rem;
  font-size: 0.95rem;
}
p.contact {
  font-size: 0.85rem;
  margin: 0 0 1.75rem;
}
p.contact a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
p.contact a:hover {
  text-decoration: underline;
}
.actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
a.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--fg);
  transition: border-color 0.15s ease, background 0.15s ease;
}
a.btn:hover {
  background: color-mix(in oklab, var(--accent) 10%, var(--card));
  border-color: var(--accent);
}
a.btn.primary {
  background: var(--logo-fg);
  color: var(--bg);
  border-color: var(--logo-fg);
}
a.btn.primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
.status {
  margin-top: 2rem;
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
`.trim();

const LOGO_SVG = `<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" aria-hidden="true">
<g transform="rotate(15, 60, 60)">
<path class="fg-stroke" d="M 60,36 A 24,24 0 1 1 36,60" stroke-width="5" fill="none" stroke-linecap="round"/>
<line class="fg-stroke" x1="60" y1="8" x2="60" y2="112" stroke-width="5" stroke-linecap="round"/>
</g>
<line class="accent-stroke" x1="66" y1="37" x2="56" y2="34" stroke-width="2.5" stroke-linecap="round"/>
<line class="accent-stroke" x1="56" y1="34" x2="44" y2="40" stroke-width="2.5" stroke-linecap="round"/>
<line class="accent-stroke" x1="44" y1="40" x2="37" y2="54" stroke-width="2.5" stroke-linecap="round"/>
<line class="accent-stroke" x1="56" y1="34" x2="37" y2="54" stroke-width="1.5" opacity="0.35"/>
<line class="accent-stroke" x1="56" y1="34" x2="46" y2="18" stroke-width="2" stroke-linecap="round"/>
<line class="accent-stroke" x1="44" y1="40" x2="28" y2="28" stroke-width="2" stroke-linecap="round"/>
<circle class="fg-fill" cx="73" cy="10" r="5"/>
<circle class="fg-fill" cx="47" cy="110" r="5"/>
<circle class="fg-fill" cx="66" cy="37" r="4.5"/>
<circle class="fg-fill" cx="37" cy="54" r="4.5"/>
<circle class="accent-fill" cx="56" cy="34" r="4"/>
<circle class="accent-fill" cx="44" cy="40" r="4"/>
<circle class="accent-fill" cx="46" cy="18" r="3.5"/>
<circle class="accent-fill" cx="28" cy="28" r="3.5"/>
</svg>`;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><g transform="rotate(15, 32, 32)"><path d="M 32,19 A 13,13 0 1 1 19,32" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/><line x1="32" y1="4" x2="32" y2="60" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/></g><line x1="35" y1="20" x2="30" y2="18" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="18" x2="23" y2="22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><line x1="23" y1="22" x2="20" y2="29" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><circle cx="39" cy="5" r="3.5" fill="#1e293b"/><circle cx="25" cy="59" r="3.5" fill="#1e293b"/><circle cx="30" cy="18" r="3" fill="#3b82f6"/><circle cx="23" cy="22" r="3" fill="#3b82f6"/></svg>`;
