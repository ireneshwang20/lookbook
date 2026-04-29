import Fastify from "fastify";
import cors from "@fastify/cors";
import { scrapeProduct } from "./scrape.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

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

const port = Number(process.env.PORT ?? 5174);
app.listen({ port, host: "127.0.0.1" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
