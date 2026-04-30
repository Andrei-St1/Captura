import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionLimits } from "@/lib/subscription";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [limits, { data: rawAlbums }] = await Promise.all([
    getSubscriptionLimits(user.id),
    supabase
      .from("albums")
      .select(
        "id, title, status, used_bytes, allocated_gb, open_date, close_date, thumbnail_url, created_at, media(count)"
      )
      .eq("owner_id", user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
  ]);

  const albums = (rawAlbums ?? []).map((a: any) => ({
    id: a.id as string,
    title: a.title as string,
    status: a.status as string,
    used_bytes: (a.used_bytes ?? 0) as number,
    allocated_gb: (a.allocated_gb ?? 1) as number,
    open_date: (a.open_date ?? null) as string | null,
    close_date: (a.close_date ?? null) as string | null,
    thumbnail_url: (a.thumbnail_url ?? null) as string | null,
    created_at: a.created_at as string,
    mediaCount: Array.isArray(a.media)
      ? ((a.media[0]?.count ?? 0) as number)
      : ((a.media?.count ?? 0) as number),
  }));

  const totalMediaCount = albums.reduce((sum, a) => sum + a.mediaCount, 0);

  return (
    <DashboardClient
      user={{
        displayName,
        firstName,
        initials,
        email: user.email ?? "",
      }}
      plan={limits.plan}
      usage={{
        albumsCount: limits.usage.albumsCount,
        usedStorageGb: limits.usage.usedStorageGb,
        storagePercent: limits.usage.storagePercent,
        albumsPercent: limits.usage.albumsPercent,
      }}
      limits={{
        remainingAlbums: limits.limits.remainingAlbums,
        remainingStorageGb: limits.limits.remainingStorageGb,
        canCreateAlbum: limits.limits.canCreateAlbum,
      }}
      hasActiveSubscription={limits.hasActiveSubscription}
      albums={albums}
      totalMediaCount={totalMediaCount}
      checkout={checkout}
    />
  );
}
