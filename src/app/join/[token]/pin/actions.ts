"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPin } from "@/lib/pin";

export async function verifyAlbumPin(formData: FormData) {
  const pin     = (formData.get("pin")     as string ?? "").trim();
  const token   =  formData.get("token")   as string;
  const albumId =  formData.get("albumId") as string;
  const pinHash =  formData.get("pinHash") as string;

  if (!/^\d{4}$/.test(pin) || hashPin(pin) !== pinHash) {
    redirect(`/join/${token}/pin?error=1`);
  }

  const store = await cookies();
  store.set(`jn_pin_${albumId}`, hashPin(pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/join",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(`/join/${token}`);
}
