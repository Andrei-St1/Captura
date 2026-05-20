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
    .select("id, title, description, location, cover_url, color_scheme")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album) notFound();

  return <WelcomeForm album={album} />;
}
