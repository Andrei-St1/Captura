"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateToken, generateQRDataURL } from "@/lib/qr";

export async function createQRCode(albumId: string, label: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return { error: "Album not found." };

  const { error } = await supabase.from("qr_codes").insert({
    album_id: albumId,
    token: generateToken(),
    label: label.trim() || "Default",
    enabled: true,
  });

  if (error) return { error: error.message };

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function toggleQRCode(qrId: string, albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, albums(owner_id)")
    .eq("id", qrId)
    .single();

  if (!qr || (qr.albums as any)?.owner_id !== user.id) return { error: "Not found." };

  await supabase.from("qr_codes").update({ enabled: !qr.enabled }).eq("id", qrId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function regenerateQRToken(qrId: string, albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, albums(owner_id)")
    .eq("id", qrId)
    .single();

  if (!qr || (qr.albums as any)?.owner_id !== user.id) return { error: "Not found." };

  await supabase.from("qr_codes").update({ token: generateToken() }).eq("id", qrId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function deleteQRCode(qrId: string, albumId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, albums(owner_id)")
    .eq("id", qrId)
    .single();

  if (!qr || (qr.albums as any)?.owner_id !== user.id) return { error: "Not found." };

  await supabase.from("qr_codes").delete().eq("id", qrId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}

export async function getAlbumQRCodesForDashboard(albumId: string): Promise<
  { id: string; label: string; enabled: boolean; joinUrl: string; dataUrl: string }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();
  if (!album) return [];

  const { data: qrRows } = await supabase
    .from("qr_codes")
    .select("id, token, label, enabled")
    .eq("album_id", albumId)
    .order("created_at", { ascending: true });

  if (!qrRows?.length) return [];

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return Promise.all(
    qrRows.map(async (qr) => {
      const joinUrl = `${appUrl}/join/${qr.token}`;
      const dataUrl = await generateQRDataURL(joinUrl);
      return { id: qr.id, label: qr.label, enabled: qr.enabled, joinUrl, dataUrl };
    })
  );
}

export async function updateQRLabel(qrId: string, albumId: string, label: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, albums(owner_id)")
    .eq("id", qrId)
    .single();

  if (!qr || (qr.albums as any)?.owner_id !== user.id) return { error: "Not found." };

  await supabase.from("qr_codes").update({ label: label.trim() || "Default" }).eq("id", qrId);

  revalidatePath(`/albums/${albumId}`);
  return { success: true };
}
