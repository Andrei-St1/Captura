"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function createCheckoutSession(formData: FormData) {
  const planId = formData.get("planId") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get the plan's Stripe price ID
  const { data: plan } = await supabase
    .from("plans")
    .select("stripe_price_id, name")
    .eq("id", planId)
    .single();

  if (!plan?.stripe_price_id) {
    throw new Error("Plan not found");
  }

  // Check if user already has a Stripe customer ID
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    ...(sub?.stripe_customer_id
      ? { customer: sub.stripe_customer_id }
      : { customer_email: user.email }),
    metadata: {
      user_id: user.id,
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  });

  redirect(session.url!);
}

export async function createPortalSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_customer_id) redirect("/pricing");

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  redirect(session.url);
}
