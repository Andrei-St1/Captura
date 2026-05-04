import sharp from "sharp";

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

export async function maybeConvertHeic(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  if (!HEIC_TYPES.has(mimeType)) return { buffer, mimeType, fileName };

  const converted = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  const newName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
  return { buffer: converted, mimeType: "image/jpeg", fileName: newName };
}
