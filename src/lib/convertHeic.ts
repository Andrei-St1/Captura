import sharp from "sharp";

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

export async function maybeConvertHeic(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string; takenAt: string | null }> {
  if (!HEIC_TYPES.has(mimeType)) return { buffer, mimeType, fileName, takenAt: null };

  let takenAt: string | null = null;
  try {
    const { parse } = await import("exifr");
    const parsed = await parse(buffer as unknown as ArrayBuffer, ["DateTimeOriginal", "DateTime"]);
    const date = parsed?.DateTimeOriginal ?? parsed?.DateTime;
    if (date instanceof Date && !isNaN(date.getTime())) takenAt = date.toISOString();
  } catch { /* ignore */ }

  const converted = await sharp(buffer).webp({ quality: 85 }).toBuffer();
  const newName = fileName.replace(/\.(heic|heif)$/i, ".webp");
  return { buffer: converted, mimeType: "image/webp", fileName: newName, takenAt };
}
