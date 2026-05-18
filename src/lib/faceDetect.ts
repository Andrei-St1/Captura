import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

interface DetectedFace {
  id: string;
  mediaId: string;
  albumId: string;
  descriptor: number[];
  box: { x: number; y: number; w: number; h: number };
  cropB64?: string;
}

export async function detectAndSaveFaces(mediaId: string, albumId: string, imageUrl: string) {
  const url = process.env.FACE_SERVICE_URL;
  if (!url) return;

  try {
    const res = await fetch(`${url}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, albumId, imageUrl }),
    });
    if (!res.ok) return;

    const detected = (await res.json()) as DetectedFace[];
    if (!detected?.length) return;

    // Upload face crops to R2 in parallel
    const cropUrls = await Promise.all(
      detected.map(async (face) => {
        if (!face.cropB64) return null;
        try {
          const cropPath = `faces/${albumId}/${face.id}.jpg`;
          const cropBuffer = Buffer.from(face.cropB64, "base64");
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: cropPath,
            Body: cropBuffer,
            ContentType: "image/jpeg",
            ContentLength: cropBuffer.length,
          }));
          return `${R2_PUBLIC_URL}/${cropPath}`;
        } catch {
          return null;
        }
      })
    );

    const service = createServiceClient();

    // Save faces with cluster_id = null — reclusterAlbum assigns clusters on next page load
    await service.from("album_faces").upsert(
      detected.map((face, i) => ({
        id: face.id,
        media_id: mediaId,
        album_id: albumId,
        descriptor: face.descriptor,
        box_x: face.box.x,
        box_y: face.box.y,
        box_w: face.box.w,
        box_h: face.box.h,
        cluster_id: null,
        ...(cropUrls[i] ? { crop_url: cropUrls[i] } : {}),
      })),
      { onConflict: "id" }
    );
  } catch {
    // face detection is best-effort, never block the upload
  }
}
