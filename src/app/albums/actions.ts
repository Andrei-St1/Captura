"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { r2, R2_BUCKET } from "@/lib/r2";
import { generateToken } from "@/lib/qr";

export async function createAlbum(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check subscription + limits
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, plans(max_albums, storage_gb)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) redirect("/pricing");

  const maxAlbums = (sub.plans as any)?.max_albums ?? 0;
  const planStorageGb = (sub.plans as any)?.storage_gb ?? 0;

  // Count existing albums
  const { count } = await supabase
    .from("albums")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .neq("status", "deleted");

  if ((count ?? 0) >= maxAlbums) {
    return { error: `Your plan allows a maximum of ${maxAlbums} albums. Upgrade to create more.` };
  }

  // Validate allocated storage
  const allocatedGb = parseInt(formData.get("allocated_gb") as string, 10);

  const { data: existingAlbums } = await supabase
    .from("albums")
    .select("allocated_gb")
    .eq("owner_id", user.id)
    .neq("status", "deleted");

  const totalAllocated = (existingAlbums ?? []).reduce(
    (sum, a) => sum + (a.allocated_gb ?? 0),
    0
  );

  if (totalAllocated + allocatedGb > planStorageGb) {
    const remaining = planStorageGb - totalAllocated;
    return { error: `Only ${remaining} GB remaining in your storage pool.` };
  }

  const title = (formData.get("title") as string).trim();
  const openDate = (formData.get("open_date") as string | null) || null;
  const closeDate = (formData.get("close_date") as string | null) || null;
  const showGallery = formData.get("show_gallery") === "true";

  const { data: album, error } = await supabase
    .from("albums")
    .insert({
      owner_id: user.id,
      title,
      open_date: openDate,
      close_date: closeDate,
      allocated_gb: allocatedGb,
      show_gallery: showGallery,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create default QR code
  await supabase.from("qr_codes").insert({
    album_id: album.id,
    token: generateToken(),
    label: "Default",
    enabled: true,
  });

  return { albumId: album.id };
}

export async function updateAlbum(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = formData.get("id") as string;

  // Verify ownership
  const { data: existing } = await supabase
    .from("albums")
    .select("id, allocated_gb")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!existing) return { error: "Album not found." };

  const newAllocatedGb = parseInt(formData.get("allocated_gb") as string, 10);

  // Validate storage if allocation changed
  if (newAllocatedGb !== existing.allocated_gb) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plans(storage_gb)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const planStorageGb = (sub?.plans as any)?.storage_gb ?? 0;

    const { data: otherAlbums } = await supabase
      .from("albums")
      .select("allocated_gb")
      .eq("owner_id", user.id)
      .neq("status", "deleted")
      .neq("id", id);

    const otherAllocated = (otherAlbums ?? []).reduce(
      (sum, a) => sum + (a.allocated_gb ?? 0), 0
    );

    if (otherAllocated + newAllocatedGb > planStorageGb) {
      const remaining = planStorageGb - otherAllocated;
      return { error: `Only ${remaining} GB remaining in your storage pool.` };
    }
  }

  const title = (formData.get("title") as string).trim();
  const openDate = (formData.get("open_date") as string | null) || null;
  const closeDate = (formData.get("close_date") as string | null) || null;
  const showGallery = formData.get("show_gallery") === "true";

  const { error } = await supabase
    .from("albums")
    .update({
      title,
      open_date: openDate,
      close_date: closeDate,
      allocated_gb: newAllocatedGb,
      show_gallery: showGallery,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  redirect(`/albums/${id}`);
}

export async function updateWelcomePage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("id") as string;
  const title = (formData.get("title") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const location = (formData.get("location") as string | null)?.trim() || null;

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album) return { error: "Album not found." };

  const { error } = await supabase
    .from("albums")
    .update({ title, description, location })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/albums/${id}`);
  redirect(`/albums/${id}`);
}

export async function deleteAlbum(albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify ownership + get cover_url
  const { data: album } = await supabase
    .from("albums")
    .select("id, cover_url")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return { error: "Album not found." };

  const service = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

  // Delete all media files from R2
  const { data: mediaFiles } = await service
    .from("media")
    .select("file_path")
    .eq("album_id", albumId);

  if (mediaFiles && mediaFiles.length > 0) {
    await Promise.all(
      mediaFiles.map((m) =>
        r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: m.file_path })).catch(() => {})
      )
    );
  }

  // Delete cover from R2
  if (album.cover_url && appUrl) {
    const coverPath = album.cover_url.replace(appUrl + "/", "");
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: coverPath })).catch(() => {});
  }

  // Delete DB records (faces → media → qr_codes → album)
  await service.from("album_faces").delete().eq("album_id", albumId);
  await service.from("media").delete().eq("album_id", albumId);
  await service.from("qr_codes").delete().eq("album_id", albumId);
  await service.from("albums").delete().eq("id", albumId);

  redirect("/albums");
}

export async function setAlbumStatus(albumId: string, status: "active" | "archived") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("albums")
    .update({ status })
    .eq("id", albumId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function deleteMedia(mediaId: string, albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Verify album ownership
  const { data: album } = await supabase
    .from("albums")
    .select("id, used_bytes")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return { error: "Album not found." };

  // Get media record
  const serviceClient = createServiceClient();
  const { data: media } = await serviceClient
    .from("media")
    .select("id, file_path, file_size")
    .eq("id", mediaId)
    .eq("album_id", albumId)
    .single();

  if (!media) return { error: "File not found." };

  // Delete from R2
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: media.file_path }));
  } catch (err) {
    console.error("R2 delete error:", err);
  }

  // Delete from DB
  await serviceClient.from("album_faces").delete().eq("media_id", mediaId);
  await serviceClient.from("media").delete().eq("id", mediaId);

  // Update album used_bytes
  const newUsed = Math.max(0, (album.used_bytes ?? 0) - media.file_size);
  await serviceClient.from("albums").update({ used_bytes: newUsed }).eq("id", albumId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function deleteMediaBulk(mediaIds: string[], albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // One ownership check
  const { data: album } = await supabase
    .from("albums")
    .select("id, used_bytes")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();
  if (!album) return { error: "Album not found." };

  const service = createServiceClient();

  // Fetch all records in one query
  const { data: mediaFiles } = await service
    .from("media")
    .select("id, file_path, file_size")
    .in("id", mediaIds)
    .eq("album_id", albumId);

  if (!mediaFiles?.length) return { success: true };

  // Delete from R2 in parallel
  await Promise.all(
    mediaFiles.map((m) =>
      r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: m.file_path })).catch(() => {})
    )
  );

  const ids = mediaFiles.map((m) => m.id);

  // Delete faces + media in one query each
  await service.from("album_faces").delete().in("media_id", ids);
  await service.from("media").delete().in("id", ids);

  // Update used_bytes once
  const freed = mediaFiles.reduce((sum, m) => sum + (m.file_size ?? 0), 0);
  const newUsed = Math.max(0, (album.used_bytes ?? 0) - freed);
  await service.from("albums").update({ used_bytes: newUsed }).eq("id", albumId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}
