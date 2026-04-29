import { useState } from "react";
import { scrapeProduct, proxyImageUrl } from "../lib/api";
import { cutoutImage, blobToObjectURL } from "../lib/bgRemove";

export interface NewItem {
  imageUrl: string;
  brand: string | null;
  title: string | null;
  sourceUrl: string | null;
}

interface Props {
  onAdd: (item: NewItem) => void;
}

interface Task {
  id: string;
  label: string;
  phase: "scraping" | "cutout";
  progress: string;
}

interface FailedTask {
  id: string;
  label: string;
  message: string;
}

function shortLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 32);
  }
}

let taskCounter = 0;

export default function AddFromLink({ onAdd }: Props) {
  const [url, setUrl] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errors, setErrors] = useState<FailedTask[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const submitted = url.trim();
    if (!submitted) return;

    const taskId = `t${++taskCounter}`;
    const label = shortLabel(submitted);
    setTasks((prev) => [
      ...prev,
      { id: taskId, label, phase: "scraping", progress: "fetching product…" },
    ]);
    setUrl("");

    try {
      const scraped = await scrapeProduct(submitted);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, phase: "cutout", progress: "removing background…" }
            : t
        )
      );
      const cutout = await cutoutImage(proxyImageUrl(scraped.imageUrl), {
        onProgress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId ? { ...t, progress: `${key} ${pct}%` } : t
              )
            );
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrors((prev) => [...prev, { id: taskId, label, message }]);
    } finally {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  async function handleFile(file: File) {
    const taskId = `t${++taskCounter}`;
    const label = file.name.length > 24 ? file.name.slice(0, 24) + "…" : file.name;
    setTasks((prev) => [
      ...prev,
      { id: taskId, label, phase: "cutout", progress: "removing background…" },
    ]);
    const sourceBlobUrl = URL.createObjectURL(file);
    try {
      const cutout = await cutoutImage(sourceBlobUrl, {
        onProgress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId ? { ...t, progress: `${key} ${pct}%` } : t
              )
            );
          }
        },
      });
      onAdd({
        imageUrl: blobToObjectURL(cutout),
        brand: null,
        title: file.name,
        sourceUrl: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrors((prev) => [...prev, { id: taskId, label, message }]);
    } finally {
      URL.revokeObjectURL(sourceBlobUrl);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(handleFile);
    e.target.value = "";
  }

  function dismissError(id: string) {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }

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
          className="flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-900"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500 hover:border-stone-500 hover:text-stone-700">
        or upload an image
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
      </label>

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-stone-500">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-stone-900"
                aria-hidden
              />
              <span className="truncate">
                {t.label} — {t.progress}
              </span>
            </li>
          ))}
        </ul>
      )}

      {errors.map((err) => (
        <p key={err.id} className="text-xs text-red-600 break-words">
          {err.label}: {err.message}{" "}
          <button
            type="button"
            onClick={() => dismissError(err.id)}
            className="underline"
          >
            dismiss
          </button>
        </p>
      ))}
    </form>
  );
}
