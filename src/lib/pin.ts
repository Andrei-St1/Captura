import { createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export async function requireAlbumPin(
  albumId: string,
  pinHash: string,
  token: string,
) {
  const store = await cookies();
  const stored = store.get(`jn_pin_${albumId}`)?.value;
  if (stored !== pinHash) {
    redirect(`/join/${token}/pin`);
  }
}
