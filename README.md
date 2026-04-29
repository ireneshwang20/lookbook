# Lookbook

A solo styling tool for building aesthetic fashion lookbooks. Paste a product
URL, the app fetches the image, removes its background, and drops it onto a
Konva canvas where you can arrange items, label them with brand tags, and
export the result as a PNG.

## Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind + react-konva
- **Background removal:** [@imgly/background-removal](https://github.com/imgly/background-removal-js) (in-browser via WASM/ONNX — no GPU server, no per-image API cost)
- **Backend:** Fastify + cheerio (single `/scrape` endpoint that resolves Open
  Graph tags and JSON-LD product schema)
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
3. The frontend pipes `imageUrl` into `@imgly/background-removal` to produce a
   transparent PNG blob.
4. The blob becomes a draggable, resizable, rotatable Konva node on the canvas
   with the brand auto-labeled next to it.
5. **Export PNG** rasterizes the stage at 2x and triggers a download.

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
        ├── server.ts                Fastify app + CORS + /scrape route
        └── scrape.ts                OG tags + JSON-LD product extractor
```

## Roadmap

- Save / load lookbooks to disk (JSON + PNG snapshot)
- Palette extraction → suggested background colors that match the items
- Smarter auto-placement (currently items drop near center, manual arrange)
- Site-specific scrapers / headless-browser fallback for retailers that block
  basic fetches (Zara, Nike, etc.)
- More decoration stamps, text presets, and export sizes (story, pin, print)

## Known limitations

- Some retailers block server-side fetches; the scraper returns a clear error.
- The background-removal model is solid for clothing but struggles with hair,
  lace, and fully transparent fabric. A `remove.bg` API fallback is the natural
  upgrade if quality matters more than cost.
- No multi-user support, no auth — solo tool by design.
