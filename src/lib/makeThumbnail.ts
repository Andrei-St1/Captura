import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * Generate a ~480px WebP thumbnail and upload it to R2.
 * Returns the public URL, or null on failure (never throws).
 */
export async function makeAndUploadThumbnail(
  buffer: Buffer,
  albumId: string,
  timestamp: number,
  safeName: string,
): Promise<string | null> {
  try {
    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    const base = safeName.replace(/\.[^.]+$/, "") || "image";
    const key = `albums/${albumId}/thumbs/${timestamp}-${base}.webp`;
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: thumb,
      ContentType: "image/webp",
      ContentLength: thumb.length,
      CacheControl: IMMUTABLE_CACHE,
    }));
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error("[thumbnail] failed:", err);
    return null;
  }
}

/** Download an already-uploaded image and thumbnail it (for presigned uploads). */
export async function makeThumbnailFromUrl(
  fileUrl: string,
  albumId: string,
  timestamp: number,
  safeName: string,
): Promise<string | null> {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await makeAndUploadThumbnail(buf, albumId, timestamp, safeName);
  } catch (err) {
    console.error("[thumbnail] fetch failed:", err);
    return null;
  }
}
