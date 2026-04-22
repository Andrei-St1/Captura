import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeForm } from "./WelcomeForm";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: album } = await supabase
    .from("albums")
    .select("id, title, description, location, cover_url")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album) notFound();

  // Get first enabled QR token for preview link
  const { data: qr } = await supabase
    .from("qr_codes")
    .select("token")
    .eq("album_id", id)
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return <WelcomeForm album={album} previewToken={qr?.token ?? null} />;
}
