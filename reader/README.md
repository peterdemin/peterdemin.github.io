# Reader

Reader is a small self-hosted web reader that converts full HTML pages into clean, distraction-free article views.

The backend is a Go service using `go-trafilatura` for extraction and a custom HTML template for presentation. It is deployed behind nginx and a socket-activated systemd unit to keep idle resource usage near zero.

## What It Does

- Accepts raw HTML input via `POST /api/render`.
- Extracts main content and metadata (title, links, images).
- Renders output into a Solarized-based reader template.
- Stores rendered pages as shareable static files under `/p/...`.
- Returns a JSON payload with the canonical saved URL.

## Repository Layout

- `main.go`: backend server and rendering/storage pipeline.
- `reader.html`: embedded reader template (presentation layer).
- `static/index.html`: minimal SPA entrypoint.
- `etc/nginx/sites-available/reader`: nginx site config.
- `etc/systemd/system/reader-api.{socket,service}`: socket-activated runtime.
- `install.sh`: initial provisioning helper.
- `deploy.sh`: deploy/update helper.
- `extension/`: browser extension for one-click capture and link-to-link reader browsing.

## API

### `POST /api/render`

Query parameters:

- `base_url` (optional): original page URL used for metadata and relative URL resolution.

Request body:

- Raw HTML (`text/plain` or `text/html`).

Response (`application/json`):

```json
{
  "path": "/p/ab/cd/ef....html",
  "url": "https://reader.demin.dev/p/ab/cd/ef....html"
}
```

## Storage Model

Rendered pages are stored in:

- `/var/www/reader/p/<h0h1>/<h2h3>/<rest>.html`

Where `h...` is SHA-256 of the original request body.

Example hash `abcd234234...` becomes:

- `ab/cd/234234....html`

A precompressed sibling file is also generated:

- `...html.gz`

nginx serves these with `gzip_static on;`.

## How to Run (Local)

Build:

```bash
go build -o reader
```

Run over TCP (dev mode):

```bash
./reader -addr 127.0.0.1:8080
```

Render a page from saved HTML:

```bash
curl -sS -X POST \
  -H 'Content-Type: text/plain; charset=utf-8' \
  --data-binary @page.html \
  'http://127.0.0.1:8080/api/render?base_url=https://example.com'
```

## Deployment Model

Production flow:

1. nginx serves static assets from `/var/www/reader`.
2. nginx proxies only `/api/render` (and `/healthz`) to unix socket `/run/reader/reader.sock`.
3. systemd socket activates backend on demand.
4. backend exits after handling request(s), staying idle otherwise.

Relevant files:

- `etc/nginx/sites-available/reader`
- `etc/systemd/system/reader-api.socket`
- `etc/systemd/system/reader-api.service`

## Browser Extension Workflow

The extension avoids server-side crawling and browser CORS issues by capturing page HTML in-browser:

1. Click extension action on any page.
2. Extension captures `document.documentElement.outerHTML`.
3. Sends HTML to `https://reader.demin.dev/api/render`.
4. Navigates current tab to returned `/p/...` URL.
5. On reader pages, content script intercepts links and repeats flow via a temporary background tab.

This keeps navigation in reader mode while preserving shareable URLs.

## Key Design Decisions

1. **HTML-in, no URL fetch in backend**
- Reduces SSRF risk and removes backend crawler behavior.

2. **Socket activation**
- Keeps VPS memory usage low when idle.

3. **Static persisted output**
- Makes pages shareable and cache-friendly.

4. **Template embedded in binary**
- Ensures rendering consistency and simple deployment artifact.

5. **nginx as policy layer**
- CORS, gzip_static, static serving, and proxying remain outside app code.

## Security Notes

- Backend does not fetch remote URLs directly.
- Input body size is capped (`maxHTMLBytes` in `main.go`).
- Service is hardened with systemd restrictions (`ProtectSystem`, `NoNewPrivileges`, etc.).
- `ReadWritePaths=/var/www/reader/p` limits writable surface.

## Future Roadmap

Potential next steps:

1. Visual regression suite for `reader.html` across viewport/theme matrix.
2. Content dedup metadata index (source URL -> hash mapping).
3. Optional expiry/retention policy for `/p/*` artifacts.
4. Better code block semantics for malformed upstream HTML.
5. Reader preferences (font scale/line height/width) via query params or per-user profile.
6. Optional private mode/auth gate for non-public deployments.
7. Structured observability (request IDs, timing, extraction/save metrics).

## Build Size / Runtime Notes

Typical optimized Linux build command:

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
go build -trimpath -ldflags='-s -w -buildid=' -o reader
```

Current implementation includes early hash short-circuit for cache hits and avoids unnecessary body-to-string copies in extraction path.
