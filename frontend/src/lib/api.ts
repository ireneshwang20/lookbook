export interface ScrapeResult {
  imageUrl: string;
  title: string | null;
  brand: string | null;
  siteName: string | null;
  sourceUrl: string;
}

export async function scrapeProduct(url: string): Promise<ScrapeResult> {
  const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `scrape failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchImageAsBlob(imageUrl: string): Promise<Blob> {
  // Try direct first; if CORS blocks, route through a future proxy endpoint.
  // For now, the @imgly/background-removal lib accepts a URL string directly.
  const res = await fetch(imageUrl, { mode: "cors" });
  if (!res.ok) throw new Error(`failed to fetch image: ${res.status}`);
  return res.blob();
}
