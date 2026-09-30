import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Per-request memoised lookup of a QR code + its album by token.
// Selects the union of columns needed by all guest pages (welcome, pin, upload, gallery).
export const getQrAlbum = cache(async (token: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qr_codes")
    .select(
      "id, token, enabled, expires_at, albums(id, title, description, location, cover_url, open_date, close_date, status, show_gallery, pin_required, pin_hash, face_finder_enabled, color_scheme)"
    )
    .eq("token", token)
    .single();
  return data;
});
