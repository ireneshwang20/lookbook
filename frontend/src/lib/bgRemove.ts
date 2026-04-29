import { removeBackground } from "@imgly/background-removal";

export interface RemoveOptions {
  onProgress?: (key: string, current: number, total: number) => void;
}

export async function cutoutImage(
  imageUrl: string,
  opts: RemoveOptions = {}
): Promise<Blob> {
  return removeBackground(imageUrl, {
    progress: opts.onProgress,
    output: { format: "image/png", quality: 0.9 },
  });
}

export function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}
