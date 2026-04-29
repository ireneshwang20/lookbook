import { removeBackground } from "@imgly/background-removal";

interface InMessage {
  id: string;
  imageUrl: string;
}

interface ProgressMessage {
  id: string;
  type: "progress";
  key: string;
  current: number;
  total: number;
}

interface DoneMessage {
  id: string;
  type: "done";
  blob: Blob;
}

interface ErrorMessage {
  id: string;
  type: "error";
  message: string;
}

type OutMessage = ProgressMessage | DoneMessage | ErrorMessage;

interface WorkerCtx {
  onmessage: ((e: MessageEvent<InMessage>) => void) | null;
  postMessage: (msg: OutMessage) => void;
}

const ctx: WorkerCtx = self as unknown as WorkerCtx;

ctx.onmessage = async (e: MessageEvent<InMessage>) => {
  const { id, imageUrl } = e.data;
  try {
    const blob = await removeBackground(imageUrl, {
      progress: (key, current, total) => {
        const msg: OutMessage = { id, type: "progress", key, current, total };
        ctx.postMessage(msg);
      },
      output: { format: "image/png", quality: 0.9 },
    });
    const msg: OutMessage = { id, type: "done", blob };
    ctx.postMessage(msg);
  } catch (err) {
    const msg: OutMessage = {
      id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    ctx.postMessage(msg);
  }
};
