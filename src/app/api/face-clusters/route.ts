import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();

  const { data: clusters } = await service
    .from("face_clusters")
    .select("id, face_count, representative_face_id")
    .eq("album_id", albumId)
    .gte("face_count", 2);

  if (!clusters?.length) return NextResponse.json([]);

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

  const result = clusters
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
    .filter(Boolean);

  return NextResponse.json(result);
}
