import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

const CLUSTER_THRESHOLD = 1.1;

interface DetectedFace {
  id: string;
  mediaId: string;
  albumId: string;
  descriptor: number[];
  box: { x: number; y: number; w: number; h: number };
  cropB64?: string;
}

interface ClusterRow {
  id: string;
  centroid: number[] | null;
  face_count: number;
  representative_face_id: string | null;
}

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
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

    const service = createServiceClient();

    // Fetch existing cluster centroids for this album
    const { data: existingClusters } = await service
      .from("face_clusters")
      .select("id, centroid, face_count, representative_face_id")
      .eq("album_id", albumId);

    // Working set: existing clusters + any new ones created this batch
    const active: (ClusterRow & { dirty: boolean; isNew: boolean })[] = (existingClusters ?? []).map((c) => ({
      ...c,
      centroid: c.centroid as number[] | null,
      dirty: false,
      isNew: false,
    }));

    const assignments: { face: DetectedFace; clusterId: string; isNew: boolean }[] = [];

    for (const face of detected) {
      let best: (typeof active)[0] | null = null;
      let bestDist = CLUSTER_THRESHOLD;

      for (const c of active) {
        if (!c.centroid) continue;
        const d = euclidean(face.descriptor, c.centroid);
        if (d < bestDist) { bestDist = d; best = c; }
      }

      if (best) {
        // Incremental centroid update
        const n = best.face_count + 1;
        best.centroid = best.centroid!.map((v, i) => v + (face.descriptor[i] - v) / n);
        best.face_count = n;
        best.dirty = true;
        assignments.push({ face, clusterId: best.id, isNew: false });
      } else {
        // New person
        const newId = crypto.randomUUID();
        const newCluster = {
          id: newId,
          centroid: [...face.descriptor],
          face_count: 1,
          representative_face_id: face.id,
          dirty: false,
          isNew: true,
        };
        active.push(newCluster);
        assignments.push({ face, clusterId: newId, isNew: true });
      }
    }

    const newClusters = active.filter((c) => c.isNew);
    const dirtyClusters = active.filter((c) => c.dirty);

    // 1. Insert new clusters with null representative first (faces don't exist yet)
    if (newClusters.length > 0) {
      await service.from("face_clusters").insert(
        newClusters.map((c) => ({
          id: c.id,
          album_id: albumId,
          centroid: c.centroid,
          face_count: c.face_count,
          representative_face_id: null,
        }))
      );
    }

    // 2. Update dirty centroids
    if (dirtyClusters.length > 0) {
      await Promise.all(
        dirtyClusters.map((c) =>
          service
            .from("face_clusters")
            .update({ centroid: c.centroid, face_count: c.face_count })
            .eq("id", c.id)
        )
      );
    }

    // 3. Upload face crops to R2, then save faces with cluster_id
    const cropUrls = await Promise.all(
      assignments.map(async ({ face: f }) => {
        if (!f.cropB64) return null;
        try {
          const cropPath = `faces/${albumId}/${f.id}.jpg`;
          const cropBuffer = Buffer.from(f.cropB64, "base64");
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

    await service.from("album_faces").upsert(
      assignments.map(({ face: f, clusterId }, i) => ({
        id: f.id,
        media_id: mediaId,
        album_id: albumId,
        descriptor: f.descriptor,
        box_x: f.box.x,
        box_y: f.box.y,
        box_w: f.box.w,
        box_h: f.box.h,
        cluster_id: clusterId,
        ...(cropUrls[i] ? { crop_url: cropUrls[i] } : {}),
      })),
      { onConflict: "id" }
    );

    // 4. Now set representative_face_id — faces exist now
    if (newClusters.length > 0) {
      await Promise.all(
        newClusters.map((c) => {
          const rep = assignments.find((a) => a.clusterId === c.id);
          if (!rep) return;
          return service
            .from("face_clusters")
            .update({ representative_face_id: rep.face.id })
            .eq("id", c.id);
        })
      );
    }
  } catch {
    // face detection is best-effort, never block the upload
  }
}
