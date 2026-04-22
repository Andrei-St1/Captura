"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const fullName = (formData.get("full_name") as string).trim();
  if (!fullName) return { error: "Name cannot be empty." };

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Unauthorized" };

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!currentPassword) return { error: "Current password is required." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { error: "New passwords do not match." };
  if (currentPassword === newPassword) return { error: "New password must be different from current password." };

  // Verify current password by re-authenticating
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (authError) return { error: "Current password is incorrect." };

  // Current password verified — update to new password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { success: true };
}
