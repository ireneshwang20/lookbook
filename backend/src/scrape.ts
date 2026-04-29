import * as cheerio from "cheerio";

export interface ScrapeResult {
  imageUrl: string;
  title: string | null;
  brand: string | null;
  siteName: string | null;
  sourceUrl: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

export async function scrapeProduct(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const meta = (sel: string) => $(sel).attr("content")?.trim() || null;

  let imageUrl =
    meta('meta[property="og:image:secure_url"]') ||
    meta('meta[property="og:image"]') ||
    meta('meta[name="twitter:image"]') ||
    meta('meta[name="twitter:image:src"]');

  const title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    $("title").first().text().trim() ||
    null;

  const siteName = meta('meta[property="og:site_name"]');

  let brand: string | null = null;

  // JSON-LD fallback for richer product data
  $('script[type="application/ld+json"]').each((_, el) => {
    if (imageUrl && brand) return;
    const raw = $(el).contents().text();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes: any[] = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      const items = node?.["@graph"] ?? [node];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const type = item["@type"];
        const isProduct =
          type === "Product" ||
          (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;
        if (!imageUrl) {
          const img = item.image;
          if (typeof img === "string") imageUrl = img;
          else if (Array.isArray(img) && img.length) {
            imageUrl = typeof img[0] === "string" ? img[0] : img[0]?.url ?? null;
          } else if (img?.url) imageUrl = img.url;
        }
        if (!brand) {
          const b = item.brand;
          if (typeof b === "string") brand = b;
          else if (b?.name) brand = b.name;
        }
      }
    }
  });

  if (!imageUrl) {
    throw new Error("could not find a product image on this page");
  }

  // Resolve protocol-relative or relative URLs
  try {
    imageUrl = new URL(imageUrl, url).toString();
  } catch {
    // leave as-is
  }

  if (!brand && siteName) brand = siteName;

  return {
    imageUrl,
    title,
    brand,
    siteName,
    sourceUrl: url,
  };
}
