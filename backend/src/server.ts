import Fastify from "fastify";
import cors from "@fastify/cors";
import { scrapeProduct } from "./scrape.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

app.get("/health", async () => ({ ok: true }));

app.get<{ Querystring: { url?: string } }>("/scrape", async (req, reply) => {
  const url = req.query.url;
  if (!url) {
    return reply.code(400).send({ error: "missing url query param" });
  }
  try {
    const result = await scrapeProduct(url);
    return result;
  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({
      error: err instanceof Error ? err.message : "scrape failed",
    });
  }
});

app.get<{ Querystring: { url?: string } }>(
  "/proxy-image",
  async (req, reply) => {
    const url = req.query.url;
    if (!url) {
      return reply.code(400).send({ error: "missing url query param" });
    }
    try {
      const upstream = await fetch(url, {
        headers: {
          "User-Agent": UA,
          // Avoid AVIF — @imgly/background-removal can't decode it. Most
          // CDNs do content-negotiation and will return JPEG/PNG/WebP if
          // we don't list AVIF as accepted.
          Accept: "image/png,image/jpeg,image/webp,image/*;q=0.8",
        },
        redirect: "follow",
      });
      if (!upstream.ok) {
        return reply
          .code(upstream.status)
          .send({ error: `upstream ${upstream.status}` });
      }
      const contentType =
        upstream.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await upstream.arrayBuffer());
      reply
        .header("content-type", contentType)
        .header("cache-control", "public, max-age=86400");
      return reply.send(buffer);
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({
        error: err instanceof Error ? err.message : "image proxy failed",
      });
    }
  }
);

const port = Number(process.env.PORT ?? 5174);
app.listen({ port, host: "127.0.0.1" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
