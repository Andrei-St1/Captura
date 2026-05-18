const SKIP_CONVERT = new Set(["image/gif", "image/webp"]);
const SKIP_CONVERT_SIZE = 200 * 1024; // WebP savings negligible below 200 KB
const MAX_PX = 2560;

export async function extractExifDate(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const { parse } = await import("exifr");
    const result = await parse(file, ["DateTimeOriginal", "DateTime"]);
    const date = result?.DateTimeOriginal ?? result?.DateTime;
    if (date instanceof Date && !isNaN(date.getTime())) return date.toISOString();
  } catch { /* ignore */ }
  return null;
}

export async function convertToWebP(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || SKIP_CONVERT.has(file.type) || file.size < SKIP_CONVERT_SIZE) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.85)
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}
