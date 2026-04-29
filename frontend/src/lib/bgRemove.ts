import BgWorker from "./bgRemove.worker?worker";

export interface RemoveOptions {
  onProgress?: (key: string, current: number, total: number) => void;
}

interface PendingTask {
  resolve: (blob: Blob) => void;
  reject: (err: Error) => void;
  onProgress?: (key: string, current: number, total: number) => void;
}

let worker: Worker | null = null;
const pending = new Map<string, PendingTask>();
let counter = 0;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new BgWorker();
  worker.onmessage = (e: MessageEvent) => {
    const data = e.data as
      | { id: string; type: "progress"; key: string; current: number; total: number }
      | { id: string; type: "done"; blob: Blob }
      | { id: string; type: "error"; message: string };
    const task = pending.get(data.id);
    if (!task) return;
    if (data.type === "progress") {
      task.onProgress?.(data.key, data.current, data.total);
    } else if (data.type === "done") {
      pending.delete(data.id);
      task.resolve(data.blob);
    } else if (data.type === "error") {
      pending.delete(data.id);
      task.reject(new Error(data.message));
    }
  };
  worker.onerror = (e) => {
    console.error("bg-removal worker error", e);
  };
  return worker;
}

export async function cutoutImage(
  imageUrl: string,
  opts: RemoveOptions = {}
): Promise<Blob> {
  const id = `bg${++counter}`;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress: opts.onProgress });
    getWorker().postMessage({ id, imageUrl });
  });
}

export function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}
