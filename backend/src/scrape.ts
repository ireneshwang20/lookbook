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

function pickImage(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const picked = pickImage(entry);
      if (picked) return picked;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.contentUrl === "string") return obj.contentUrl;
  }
  return null;
}

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

  // Some retailers (Gentle Monster, Zara, Nike, etc.) return a 200/202 with an
  // anti-bot challenge page instead of the real product HTML. Detect the
  // common signatures so the user sees a useful error instead of "no image".
  const looksLikeBotChallenge =
    res.status === 202 ||
    (html.length < 4000 &&
      /awsWaf|aws-waf-token|cf-browser-verification|cf-mitigated|just a moment|checking your browser|access denied|enable javascript and cookies/i.test(
        html
      ));
  if (looksLikeBotChallenge) {
    throw new Error(
      "this retailer's site is behind a bot-protection wall (AWS WAF, Cloudflare, etc.) and won't serve a real page to our scraper — try uploading the image directly instead"
    );
  }

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
        const matchesType = (t: string) =>
          type === t || (Array.isArray(type) && type.includes(t));
        const isProduct = matchesType("Product") || matchesType("ProductGroup");
        if (!isProduct) continue;

        if (!imageUrl) {
          imageUrl = pickImage(item.image);
        }
        // ProductGroup may delegate the image to its first variant
        if (!imageUrl && Array.isArray(item.hasVariant)) {
          for (const variant of item.hasVariant) {
            const fromVariant = pickImage(variant?.image);
            if (fromVariant) {
              imageUrl = fromVariant;
              break;
            }
          }
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
