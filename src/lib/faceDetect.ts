import { createServiceClient } from "@/lib/supabase/service";

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

    const faces = await res.json() as {
      id: string; mediaId: string; albumId: string;
      descriptor: number[];
      box: { x: number; y: number; w: number; h: number };
    }[];

    if (!faces?.length) return;

    const service = createServiceClient();
    await service.from("album_faces").upsert(
      faces.map((f) => ({
        id: f.id,
        media_id: f.mediaId,
        album_id: f.albumId,
        descriptor: f.descriptor,
        box_x: f.box.x,
        box_y: f.box.y,
        box_w: f.box.w,
        box_h: f.box.h,
      })),
      { onConflict: "id" }
    );
  } catch {
    // face detection is best-effort, never block the upload
  }
}
