# Lookbook

A solo styling tool for building aesthetic fashion lookbooks. Paste a product
URL, the app fetches the image, removes its background, and drops it onto a
Konva canvas where you can arrange items, label them with brand tags, and
export the result as a PNG.

## Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind + react-konva
- **Background removal:** [@imgly/background-removal](https://github.com/imgly/background-removal-js) (in-browser via WASM/ONNX — no GPU server, no per-image API cost)
- **Backend:** Fastify + cheerio with two endpoints — `/scrape` (Open Graph +
  JSON-LD product extraction) and `/proxy-image` (same-origin pass-through for
  product images so the browser-side bg-removal lib isn't blocked by CORS)
- **Storage:** none yet (state is in-memory; refresh = lose work)

## Quick start

```sh
# install
npm --prefix backend install
npm --prefix frontend install

# run both dev servers
npm run dev          # uses concurrently to start backend (5174) + frontend (5173)
```

Open `http://localhost:5173`. First cutout downloads the ~80 MB ONNX model;
subsequent cutouts run from cache.

## How it works

1. You paste a product URL into the sidebar.
2. The frontend hits `/api/scrape` (proxied to `:5174`); the backend fetches
   the page, parses Open Graph + JSON-LD, returns `{ imageUrl, brand, title }`.
3. To dodge cross-origin CDN blocks, the frontend rewrites `imageUrl` to
   `/api/proxy-image?url=...` (absolute, same-origin). The backend fetches the
   image with an Accept header that excludes AVIF (most CDNs do content
   negotiation and fall back to WebP/JPEG/PNG, which the bg-removal lib can
   actually decode).
4. The proxied URL is piped into `@imgly/background-removal`, producing a
   transparent PNG blob.
5. The blob becomes a draggable, resizable, rotatable Konva node on the canvas
   with the brand auto-labeled next to it. Items drop at a sensible initial
   scale based on the cutout's natural height (~320px tall, not blown up).
6. The canvas auto-scales to fit the available viewport (logical resolution
   stays at 1200x900 so exports keep their quality).
7. **Export PNG** rasterizes the current page's stage at 2x and triggers a
   download.

The form is non-blocking: paste a second URL while the first is still
processing, keep dragging items, switch pages — nothing waits on the cutout
queue. Per-task progress shows below the input.

## Project layout

```
lookbook/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  sidebar + canvas wiring
│   │   ├── components/
│   │   │   ├── Canvas.tsx           Konva stage, items, decorations
│   │   │   └── AddFromLink.tsx      paste-link form, scrape + cutout flow
│   │   └── lib/
│   │       ├── api.ts               /api/scrape client
│   │       └── bgRemove.ts          @imgly/background-removal wrapper
│   └── vite.config.ts               proxies /api → http://127.0.0.1:5174
└── backend/
    └── src/
        ├── server.ts                Fastify app + CORS + /scrape and /proxy-image
        └── scrape.ts                OG tags + JSON-LD product/ProductGroup extractor
```

## Editing

- **Inline text editing.** Double-click the title, subtitle, or "1 OUTFIT
  PACKAGE" pill on the canvas to edit it in place. Enter or Esc commits.
- **Multi-page lookbooks.** Sidebar has page tabs with `+`, Duplicate, and
  Delete; each page owns its own items, background, title, subtitle, and pill.
- **Bring to front.** Clicking an item moves it to the top of the z-stack so
  it can sit on top of any others.
- **Delete shortcut.** Selected item + Delete or Backspace removes it (the
  shortcut is suppressed while typing in inputs).

## Roadmap

- Save / load lookbooks to disk (JSON + PNG snapshot)
- Palette extraction → suggested background colors that match the items
- Smarter auto-placement (currently items drop near center, manual arrange)
- Site-specific scrapers / headless-browser fallback for retailers that block
  basic fetches (Zara, Nike, etc.)
- More decoration stamps, text presets, and export sizes (story, pin, print)
- Multi-page export (PDF or zip of PNGs); current export is per-page

## Known limitations

- Some retailers block server-side fetches; the scraper returns a clear error.
- The background-removal model is solid for clothing but struggles with hair,
  lace, and fully transparent fabric. A `remove.bg` API fallback is the natural
  upgrade if quality matters more than cost.
- A few CDNs return AVIF unconditionally regardless of the Accept header — those
  cutouts will fail until we add server-side AVIF→PNG conversion (sharp).
- No multi-user support, no auth — solo tool by design.
