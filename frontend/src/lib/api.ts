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

export function proxyImageUrl(imageUrl: string): string {
  // Absolute URL so libraries (e.g. @imgly/background-removal) don't resolve
  // relative paths against their own resources base.
  return `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(
    imageUrl
  )}`;
}
