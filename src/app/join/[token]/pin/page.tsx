import { notFound } from "next/navigation";
import { getQrAlbum } from "@/lib/getQrAlbum";
import { PinClient } from "./PinClient";
import { getScheme, schemeToCss } from "@/lib/colorSchemes";

export default async function PinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error }  = await searchParams;

  const qr = await getQrAlbum(token);

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  // If PIN not actually required, skip straight to welcome
  if (!album.pin_required || !album.pin_hash) {
    const { redirect } = await import("next/navigation");
    redirect(`/join/${token}`);
  }

  return (
    <>
      <style>{schemeToCss(getScheme(album.color_scheme))}</style>
      <PinClient
        token={token}
        albumId={album.id}
        albumTitle={album.title}
        pinHash={album.pin_hash}
        hasError={error === "1"}
      />
    </>
  );
}
