# phiacta-edge

Cloudflare Worker that intercepts requests to `phiacta.com` and
`api.phiacta.com` and replaces the generic "Web server is down" page
(Cloudflare 5xx) with a Phiacta-branded response.

- **Origin reachable** → request passes through unmodified.
- **Origin throws or returns 502 / 503 / 504** → Worker serves a themed
  503:
  - `phiacta.com` → full HTML page with logo, light/dark theme.
  - `api.phiacta.com` → JSON `{ "error": "service_unavailable", ... }`,
    with an HTML fallback if `Accept: text/html` is sent (and JSON not
    requested). CORS headers are set for `*.phiacta.com` origins so
    browser callers get the real error instead of an opaque CORS failure.
- Genuine `500` from FastAPI propagates — only gateway-style 5xx
  triggers the branded page.

## Layout

```
src/
  index.ts       # fetch handler — try origin, fall back on failure
  responses.ts   # pure response builders (HTML, JSON, CORS)
test/
  responses.test.ts
wrangler.toml    # routes
```

## Develop

```bash
npm install
npm run dev       # wrangler dev — local origin is mocked
npm test          # vitest
npm run typecheck # tsc --noEmit
```

`wrangler dev` proxies to your account's origin. To preview the down
page itself, hit `wrangler dev` with the origin disabled or pointed at
an unreachable host.

## Deploy

Prereqs:

1. `npm install` (one-time).
2. Copy `.env.example` to `.env` and fill in `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID`. (Or `npx wrangler login` for browser
   auth.)
3. The `phiacta.com` zone must exist in the Cloudflare account.

Then:

```bash
npm run deploy
```

The npm scripts wrap wrangler with `dotenv-cli`, so `.env` is loaded
automatically.

### Deploy via deploy.sh

`../deploy.sh up` and `../deploy.sh pull` (for any stack) also push the
Worker when `CLOUDFLARE_API_TOKEN` is set in the loaded env files
(`.env`, `.env.<stack>`). The Worker deploy runs inside a
`node:20-slim` container, so no host Node install is needed. Example:

```bash
# On the prod box, with CLOUDFLARE_API_TOKEN in .env.prod
./deploy.sh prod pull
```

When the token is absent, the Worker step is skipped with a clear
message and the rest of the deploy continues.

`wrangler deploy` reads `wrangler.toml`, uploads the Worker, and binds
it to the routes:

- `phiacta.com/*`
- `api.phiacta.com/*`

To cover `www.phiacta.com` add a third route to `wrangler.toml` and
redeploy.

## Verify

After deploy, with origin healthy:

```bash
curl -sSI https://phiacta.com/ | head -1   # HTTP/2 200
curl -sSI https://api.phiacta.com/health   # HTTP/2 200 (or whatever the API returns)
```

To verify the down page in isolation, temporarily change the
`docker-compose.yml` backend port mapping so Cloudflare can't reach
origin, then refresh — you should see the Phiacta-branded 503.
Restore the port mapping when done.
