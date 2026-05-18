import { createServiceClient } from "@/lib/supabase/service";

const CLUSTER_THRESHOLD = 0.75;

interface FaceRow {
  id: string;
  descriptor: number[];
}

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

interface Cluster {
  id: string;
  faces: FaceRow[];
  centroid: number[];
}

function computeCentroid(faces: FaceRow[]): number[] {
  const n = faces.length;
  return faces[0].descriptor.map((_, i) =>
    faces.reduce((sum, f) => sum + f.descriptor[i], 0) / n
  );
}

function greedyCluster(faces: FaceRow[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const face of faces) {
    let best: Cluster | null = null;
    let bestDist = CLUSTER_THRESHOLD;
    for (const c of clusters) {
      const d = euclidean(face.descriptor, c.centroid);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best) {
      const n = best.faces.length + 1;
      best.centroid = best.centroid.map((v, i) => v + (face.descriptor[i] - v) / n);
      best.faces.push(face);
    } else {
      clusters.push({ id: crypto.randomUUID(), faces: [face], centroid: [...face.descriptor] });
    }
  }
  return clusters;
}

// Re-assign every face using stable (non-incremental) centroids from the greedy pass.
// Fixes order-dependence: faces near a boundary get the correct cluster on second pass.
function refinementPass(clusters: Cluster[]): Cluster[] {
  const allFaces = clusters.flatMap((c) => c.faces);
  const next = clusters.map((c) => ({ id: c.id, centroid: c.centroid, faces: [] as FaceRow[] }));

  for (const face of allFaces) {
    let bestIdx = -1;
    let bestDist = CLUSTER_THRESHOLD;
    for (let i = 0; i < next.length; i++) {
      const d = euclidean(face.descriptor, next[i].centroid);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      next[bestIdx].faces.push(face);
    } else {
      next.push({ id: crypto.randomUUID(), centroid: [...face.descriptor], faces: [face] });
    }
  }

  return next
    .filter((c) => c.faces.length > 0)
    .map((c) => ({ ...c, centroid: computeCentroid(c.faces) }));
}

function pickRepresentative(cluster: Cluster): FaceRow {
  let best = cluster.faces[0];
  let bestDist = Infinity;
  for (const f of cluster.faces) {
    const d = euclidean(f.descriptor, cluster.centroid);
    if (d < bestDist) { bestDist = d; best = f; }
  }
  return best;
}

export async function reclusterAlbum(albumId: string): Promise<void> {
  const service = createServiceClient();

  const { data: faces } = await service
    .from("album_faces")
    .select("id, descriptor")
    .eq("album_id", albumId);

  if (!faces?.length) return;

  let clusters = greedyCluster(faces as FaceRow[]);
  clusters = refinementPass(clusters);

  // Null out FK references before deleting clusters
  await service.from("album_faces").update({ cluster_id: null }).eq("album_id", albumId);
  await service.from("face_clusters").delete().eq("album_id", albumId);

  if (!clusters.length) return;

  await service.from("face_clusters").insert(
    clusters.map((c) => ({
      id: c.id,
      album_id: albumId,
      centroid: c.centroid,
      face_count: c.faces.length,
      representative_face_id: null,
    }))
  );

  // One UPDATE per cluster — batches all faces in that cluster in a single query
  await Promise.all(
    clusters.map((c) =>
      service.from("album_faces").update({ cluster_id: c.id }).in("id", c.faces.map((f) => f.id))
    )
  );

  // Set representative = face closest to cluster centroid
  await Promise.all(
    clusters.map((c) => {
      const rep = pickRepresentative(c);
      return service.from("face_clusters").update({ representative_face_id: rep.id }).eq("id", c.id);
    })
  );
}
