import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PinClient } from "./PinClient";

export default async function PinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error }  = await searchParams;

  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, albums(id, title, status, pin_required, pin_hash)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  // If PIN not actually required, skip straight to welcome
  if (!album.pin_required || !album.pin_hash) {
    const { redirect } = await import("next/navigation");
    redirect(`/join/${token}`);
  }

  return (
    <PinClient
      token={token}
      albumId={album.id}
      albumTitle={album.title}
      pinHash={album.pin_hash}
      hasError={error === "1"}
    />
  );
}
