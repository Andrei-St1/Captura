import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const CLUSTER_THRESHOLD = 1.1;
const MIN_CLUSTER_SIZE = 2;

interface FaceRow {
  id: string;
  media_id: string;
  descriptor: number[];
  box_x: number; box_y: number; box_w: number; box_h: number;
  cluster_id: string | null;
}

interface ClusterResult {
  id: string;
  mediaIds: string[];
  representative: {
    box: { x: number; y: number; w: number; h: number };
    fileUrl: string | null;
    thumbnailUrl: string | null;
  };
}

type MediaJoin = { file_url: string; thumbnail_url?: string | null };

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

export async function GET(request: NextRequest) {
  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  const supabase = await createClient();
  const service = createServiceClient();

  // Auth: owner session or face_finder_enabled album (guest)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: album } = await supabase
      .from("albums").select("id").eq("id", albumId).eq("owner_id", user.id).single();
    if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const { data: album } = await service
      .from("albums").select("id, status, face_finder_enabled").eq("id", albumId).single();
    if (!album || album.status === "deleted" || !album.face_finder_enabled)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch all faces for album
  const { data: facesRaw } = await service
    .from("album_faces")
    .select("id, media_id, descriptor, box_x, box_y, box_w, box_h, cluster_id")
    .eq("album_id", albumId);

  const allFaces = (facesRaw ?? []) as FaceRow[];
  if (allFaces.length === 0) return NextResponse.json([]);

  const needsCompute = allFaces.some((f) => f.cluster_id === null);

  if (!needsCompute) {
    return NextResponse.json(await readFromCache(albumId, allFaces, service));
  }

  return NextResponse.json(await computeAndStore(albumId, allFaces, service));
}

async function readFromCache(
  albumId: string,
  faces: FaceRow[],
  service: ReturnType<typeof createServiceClient>
): Promise<ClusterResult[]> {
  const { data: clusters } = await service
    .from("face_clusters")
    .select("id, representative_face_id")
    .eq("album_id", albumId);

  if (!clusters?.length) return [];

  const repIds = clusters
    .map((c) => c.representative_face_id)
    .filter(Boolean) as string[];

  const { data: repFaces } = await service
    .from("album_faces")
    .select("id, box_x, box_y, box_w, box_h, media(file_url, thumbnail_url)")
    .in("id", repIds);

  const repMap = new Map(
    (repFaces ?? []).map((f) => {
      const m = f.media as unknown as MediaJoin | null;
      return [f.id, {
        box: { x: f.box_x, y: f.box_y, w: f.box_w, h: f.box_h },
        fileUrl: m?.file_url ?? null,
        thumbnailUrl: m?.thumbnail_url ?? null,
      }];
    })
  );

  const mediaIdsByCluster = new Map<string, string[]>();
  for (const face of faces) {
    if (!face.cluster_id) continue;
    const arr = mediaIdsByCluster.get(face.cluster_id) ?? [];
    arr.push(face.media_id);
    mediaIdsByCluster.set(face.cluster_id, arr);
  }

  return clusters
    .map((c) => {
      const mediaIds = [...new Set(mediaIdsByCluster.get(c.id) ?? [])];
      if (mediaIds.length < MIN_CLUSTER_SIZE) return null;
      const rep = repMap.get(c.representative_face_id ?? "");
      if (!rep) return null;
      return { id: c.id, mediaIds, representative: rep };
    })
    .filter(Boolean)
    .sort((a, b) => b!.mediaIds.length - a!.mediaIds.length) as ClusterResult[];
}

async function computeAndStore(
  albumId: string,
  faces: FaceRow[],
  service: ReturnType<typeof createServiceClient>
): Promise<ClusterResult[]> {
  interface TempCluster {
    faces: FaceRow[];
    centroid: number[];
    representative: FaceRow;
  }

  const clusters: TempCluster[] = [];
  for (const face of faces) {
    let best: TempCluster | null = null;
    let bestDist = CLUSTER_THRESHOLD;
    for (const c of clusters) {
      const d = euclidean(face.descriptor, c.centroid);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best) {
      best.faces.push(face);
      const n = best.faces.length;
      best.centroid = best.centroid.map((v, i) => v + (face.descriptor[i] - v) / n);
    } else {
      clusters.push({ faces: [face], centroid: [...face.descriptor], representative: face });
    }
  }

  // Wipe old clusters — cascade sets cluster_id = NULL on album_faces
  await service.from("face_clusters").delete().eq("album_id", albumId);

  // Insert new cluster rows
  const { data: inserted } = await service
    .from("face_clusters")
    .insert(clusters.map((c) => ({
      album_id: albumId,
      representative_face_id: c.representative.id,
    })))
    .select("id, representative_face_id");

  if (!inserted?.length) return [];

  // Map representative_face_id → inserted cluster id
  const repToCluster = new Map(inserted.map((c) => [c.representative_face_id, c.id]));

  // Batch-update album_faces.cluster_id grouped by cluster
  const byCluster = new Map<string, string[]>();
  for (const tc of clusters) {
    const cId = repToCluster.get(tc.representative.id);
    if (!cId) continue;
    byCluster.set(cId, tc.faces.map((f) => f.id));
  }
  await Promise.all(
    [...byCluster.entries()].map(([cId, faceIds]) =>
      service.from("album_faces").update({ cluster_id: cId }).in("id", faceIds)
    )
  );

  // Fetch representative face data for result
  const repIds = inserted.map((c) => c.representative_face_id).filter(Boolean) as string[];
  const { data: repFaces } = await service
    .from("album_faces")
    .select("id, box_x, box_y, box_w, box_h, media(file_url, thumbnail_url)")
    .in("id", repIds);

  const repMap = new Map(
    (repFaces ?? []).map((f) => {
      const m = f.media as unknown as MediaJoin | null;
      return [f.id, {
        box: { x: f.box_x, y: f.box_y, w: f.box_w, h: f.box_h },
        fileUrl: m?.file_url ?? null,
        thumbnailUrl: m?.thumbnail_url ?? null,
      }];
    })
  );

  return inserted
    .map((c) => {
      const tc = clusters.find((t) => t.representative.id === c.representative_face_id);
      if (!tc) return null;
      const mediaIds = [...new Set(tc.faces.map((f) => f.media_id))];
      if (mediaIds.length < MIN_CLUSTER_SIZE) return null;
      const rep = repMap.get(c.representative_face_id ?? "");
      if (!rep) return null;
      return { id: c.id, mediaIds, representative: rep };
    })
    .filter(Boolean)
    .sort((a, b) => b!.mediaIds.length - a!.mediaIds.length) as ClusterResult[];
}
