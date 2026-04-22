import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateAlbumForm } from "./CreateAlbumForm";

export default async function CreateAlbumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get plan storage limit
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(storage_gb)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) redirect("/pricing");

  const planStorageGb = (sub.plans as any)?.storage_gb ?? 0;

  // Sum storage already allocated across existing albums
  const { data: albums } = await supabase
    .from("albums")
    .select("allocated_gb")
    .eq("owner_id", user.id)
    .neq("status", "deleted");

  const allocatedGb = (albums ?? []).reduce((sum, a) => sum + (a.allocated_gb ?? 0), 0);

  return (
    <CreateAlbumForm
      planStorageGb={planStorageGb}
      allocatedGb={allocatedGb}
    />
  );
}
