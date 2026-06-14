import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) {
    return NextResponse.json({
      received: true,
      mode: "demo",
      todo: "Configure STRIPE_WEBHOOK_SECRET to verify events and mark premium_until on checkout completion.",
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid webhook signature.",
      },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const eventSlug = session.metadata?.eventSlug;
    const metadataEventId = session.metadata?.event_id;
    const supabase = createSupabaseServiceClient();

    if ((eventSlug || metadataEventId) && supabase) {
      let eventRowId = metadataEventId ?? null;
      if (!eventRowId && eventSlug) {
        const { data: scoutEvent } = await supabase.from("events").select("id").eq("slug", eventSlug).maybeSingle();
        eventRowId = (scoutEvent as { id?: string } | null)?.id ?? null;
      }

      if (eventRowId) {
        // One-time Pro purchase unlocks premium for a year.
        const premiumUntil = new Date();
        premiumUntil.setFullYear(premiumUntil.getFullYear() + 1);

        await supabase.from("payments").upsert(
          {
            event_id: eventRowId,
            stripe_checkout_session_id: session.id,
            buyer_email: session.customer_details?.email ?? session.customer_email ?? null,
            amount_cents: session.amount_total ?? null,
            status: "paid",
          },
          { onConflict: "stripe_checkout_session_id" },
        );
        await supabase.from("events").update({ premium_until: premiumUntil.toISOString() }).eq("id", eventRowId);
      }
    }
  }

  return NextResponse.json({
    received: true,
    type: event.type,
    todo: "Expand webhook handling for refunds, failed payments, and organizer notifications.",
  });
}
