import { createClient } from "@/lib/supabase/server";
import { PricingClient } from "./PricingClient";

export default async function PricingPage() {
  const supabase = await createClient();

  const [{ data: { user } }, { data: plans }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("plans").select("*").order("price_month"),
  ]);

  let currentPlanId: string | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", user.id)
      .single();
    if (sub?.status === "active") currentPlanId = sub.plan_id;
  }

  return (
    <PricingClient
      plans={plans ?? []}
      currentPlanId={currentPlanId}
      isLoggedIn={!!user}
    />
  );
}
