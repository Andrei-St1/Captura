import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planId = session.metadata?.plan_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId || !planId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = (subscription as any).current_period_end ?? null;

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: subscription.status,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        },
        { onConflict: "user_id" }
      );
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const planId = subscription.metadata?.plan_id;

      const updatedPeriodEnd = (subscription as any).current_period_end ?? null;

      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          ...(planId && { plan_id: planId }),
          current_period_end: updatedPeriodEnd
            ? new Date(updatedPeriodEnd * 1000).toISOString()
            : null,
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;

      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
