import { createServiceClient } from "@/lib/supabase/service";
import { reclusterAlbum } from "@/lib/faceCluster";

export interface UIFaceCluster {
  id: string;
  faceCount: number;
  mediaIds: string[];
  representative: {
    mediaId: string;
    fileUrl: string | null;
    cropUrl: string | null;
    box: { x: number; y: number; w: number; h: number };
  };
}

export async function getFaceClustersForAlbum(albumId: string): Promise<UIFaceCluster[]> {
  const service = createServiceClient();

  // Auto-recompute whenever any face lacks a cluster assignment (new uploads since last cluster run)
  const { count: unclustered } = await service
    .from("album_faces")
    .select("id", { count: "exact", head: true })
    .eq("album_id", albumId)
    .is("cluster_id", null);

  if ((unclustered ?? 0) > 0) {
    await reclusterAlbum(albumId);
  }

  const { data: clusters } = await service
    .from("face_clusters")
    .select("id, face_count, representative_face_id")
    .eq("album_id", albumId)
    .gte("face_count", 2);

  if (!clusters?.length) return [];

  const repIds = clusters.map((c) => c.representative_face_id).filter(Boolean) as string[];

  const [{ data: repFaces }, { data: allFaces }] = await Promise.all([
    service
      .from("album_faces")
      .select("id, box_x, box_y, box_w, box_h, media_id, crop_url, media(file_url)")
      .in("id", repIds),
    service
      .from("album_faces")
      .select("cluster_id, media_id")
      .eq("album_id", albumId)
      .in("cluster_id", clusters.map((c) => c.id)),
  ]);

  const mediaByCluster = new Map<string, string[]>();
  for (const f of allFaces ?? []) {
    if (!f.cluster_id) continue;
    const arr = mediaByCluster.get(f.cluster_id) ?? [];
    arr.push(f.media_id);
    mediaByCluster.set(f.cluster_id, arr);
  }

  type MediaJoin = { file_url: string };
  const repMap = new Map((repFaces ?? []).map((f) => [f.id, f]));

  return clusters
    .map((c) => {
      const rep = c.representative_face_id ? repMap.get(c.representative_face_id) : null;
      const mediaIds = mediaByCluster.get(c.id) ?? [];
      if (!rep || mediaIds.length < 2) return null;
      const media = rep.media as unknown as MediaJoin | null;
      return {
        id: c.id,
        faceCount: c.face_count,
        mediaIds: [...new Set(mediaIds)],
        representative: {
          mediaId: rep.media_id,
          fileUrl: media?.file_url ?? null,
          cropUrl: (rep as any).crop_url ?? null,
          box: { x: rep.box_x, y: rep.box_y, w: rep.box_w, h: rep.box_h },
        },
      };
    })
    .filter((c): c is UIFaceCluster => c !== null)
    .sort((a, b) => b.mediaIds.length - a.mediaIds.length);
}
