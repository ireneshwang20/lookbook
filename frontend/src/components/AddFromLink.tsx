import { useState } from "react";
import { scrapeProduct, proxyImageUrl } from "../lib/api";
import { cutoutImage, blobToObjectURL } from "../lib/bgRemove";

export interface NewItem {
  imageUrl: string;
  brand: string | null;
  title: string | null;
  sourceUrl: string;
}

interface Props {
  onAdd: (item: NewItem) => void;
}

type Phase = "idle" | "scraping" | "cutout" | "error";

export default function AddFromLink({ onAdd }: Props) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setPhase("scraping");
    setProgress("fetching product…");
    try {
      const scraped = await scrapeProduct(url.trim());
      setPhase("cutout");
      setProgress("removing background…");
      const cutout = await cutoutImage(proxyImageUrl(scraped.imageUrl), {
        onProgress: (key, current, total) => {
          if (total > 0) {
            setProgress(`${key} ${Math.round((current / total) * 100)}%`);
          }
        },
      });
      const objectUrl = blobToObjectURL(cutout);
      onAdd({
        imageUrl: objectUrl,
        brand: scraped.brand,
        title: scraped.title,
        sourceUrl: scraped.sourceUrl,
      });
      setUrl("");
      setPhase("idle");
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const busy = phase === "scraping" || phase === "cutout";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-xs uppercase tracking-widest text-stone-500">
        Add from link
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.zara.com/..."
          disabled={busy}
          className="flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
      {busy && <p className="text-xs text-stone-500">{progress}</p>}
      {error && (
        <p className="text-xs text-red-600 break-words">
          {error}{" "}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPhase("idle");
            }}
            className="underline"
          >
            dismiss
          </button>
        </p>
      )}
    </form>
  );
}
