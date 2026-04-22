import { createClient } from "@/lib/supabase/server";

export interface SubscriptionLimits {
  hasActiveSubscription: boolean;
  plan: {
    id: string;
    name: string;
    maxAlbums: number;
    storageGb: number;
  } | null;
  usage: {
    albumsCount: number;
    allocatedGb: number;       // total GB allocated across all albums
    usedStorageBytes: number;  // actual bytes uploaded
    usedStorageGb: number;     // actual GB uploaded (rounded)
    albumsPercent: number;     // albums used / max * 100
    storagePercent: number;    // usedStorageGb / planStorageGb * 100
  };
  limits: {
    canCreateAlbum: boolean;
    remainingAlbums: number;
    remainingStorageGb: number; // unallocated GB in pool
  };
}

export async function getSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  const supabase = await createClient();

  // Subscription + plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, plans(id, name, max_albums, storage_gb)")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  const plan = sub
    ? {
        id: (sub.plans as any)?.id ?? "",
        name: (sub.plans as any)?.name ?? "Unknown",
        maxAlbums: (sub.plans as any)?.max_albums ?? 0,
        storageGb: (sub.plans as any)?.storage_gb ?? 0,
      }
    : null;

  // Album usage
  const { data: albums } = await supabase
    .from("albums")
    .select("id, allocated_gb, used_bytes, status")
    .eq("owner_id", userId)
    .neq("status", "deleted");

  const albumList = albums ?? [];
  const albumsCount = albumList.length;
  const allocatedGb = albumList.reduce((sum, a) => sum + (a.allocated_gb ?? 0), 0);
  const usedStorageBytes = albumList.reduce((sum, a) => sum + (a.used_bytes ?? 0), 0);
  const usedStorageGb = parseFloat((usedStorageBytes / 1024 ** 3).toFixed(2));

  const maxAlbums = plan?.maxAlbums ?? 0;
  const planStorageGb = plan?.storageGb ?? 0;

  const albumsPercent = maxAlbums > 0 ? Math.min(100, Math.round((albumsCount / maxAlbums) * 100)) : 0;
  const storagePercent = planStorageGb > 0 ? Math.min(100, Math.round((usedStorageGb / planStorageGb) * 100)) : 0;

  const remainingAlbums = Math.max(0, maxAlbums - albumsCount);
  const remainingStorageGb = Math.max(0, planStorageGb - allocatedGb);

  return {
    hasActiveSubscription: !!sub,
    plan,
    usage: {
      albumsCount,
      allocatedGb,
      usedStorageBytes,
      usedStorageGb,
      albumsPercent,
      storagePercent,
    },
    limits: {
      canCreateAlbum: !!plan && albumsCount < maxAlbums,
      remainingAlbums,
      remainingStorageGb,
    },
  };
}
