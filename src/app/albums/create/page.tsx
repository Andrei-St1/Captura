import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateAlbumForm } from "./CreateAlbumForm";

export default async function CreateAlbumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(storage_gb, name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) redirect("/pricing");

  const planStorageGb = (sub.plans as any)?.storage_gb ?? 0;
  const planName = (sub.plans as any)?.name ?? "Pro";

  const { data: albums } = await supabase
    .from("albums")
    .select("allocated_gb")
    .eq("owner_id", user.id)
    .neq("status", "deleted");

  const allocatedGb = (albums ?? []).reduce((sum, a) => sum + (a.allocated_gb ?? 0), 0);

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName.split(" ").map((n: string) => n[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <CreateAlbumForm
      planStorageGb={planStorageGb}
      allocatedGb={allocatedGb}
      user={{ displayName, initials, email: user.email ?? "", planName }}
    />
  );
}
