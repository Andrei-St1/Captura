import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditAlbumForm } from "./EditAlbumForm";

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch album (owner only)
  const { data: album } = await supabase
    .from("albums")
    .select("id, title, open_date, close_date, allocated_gb, show_gallery, thumbnail_url")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album) notFound();

  // Fetch plan storage limit
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(storage_gb)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) redirect("/pricing");

  const planStorageGb = (sub.plans as any)?.storage_gb ?? 0;

  // Sum allocated by OTHER albums (exclude this one)
  const { data: otherAlbums } = await supabase
    .from("albums")
    .select("allocated_gb")
    .eq("owner_id", user.id)
    .neq("status", "deleted")
    .neq("id", id);

  const allocatedGbOthers = (otherAlbums ?? []).reduce(
    (sum, a) => sum + (a.allocated_gb ?? 0), 0
  );

  return (
    <EditAlbumForm
      album={album}
      planStorageGb={planStorageGb}
      allocatedGbOthers={allocatedGbOthers}
    />
  );
}
