import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getEventBoard, getEventBoardByEventId, isSyntheticEvent } from "@/lib/data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PREMIUM_AMOUNT_CENTS = 4900; // $49 one-time
const PRODUCT_NAME = "Formation Pro — Event Dashboard";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    event_id?: string;
    eventId?: string;
    event_slug?: string;
    eventSlug?: string;
    buyerEmail?: string;
  };

  const eventSlugInput = payload.event_slug ?? payload.eventSlug;
  const eventId = payload.event_id ?? payload.eventId;

  // Stripe not configured → tell the client to keep the button in disabled/demo state.
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      mode: "demo",
      configured: false,
      message: "Stripe test keys aren't set. Add STRIPE_SECRET_KEY to enable checkout.",
    });
  }

  const board = eventSlugInput
    ? await getEventBoard(eventSlugInput)
    : eventId
      ? await getEventBoardByEventId(eventId)
      : await getEventBoard("world-cup-hack");

  if (!board || isSyntheticEvent(board.event)) {
    // Don't mint a real Stripe session for an event that doesn't exist.
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const eventSlug = board.event.slug;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: payload.buyerEmail,
    success_url: appUrl(`/checkout/success?session_id={CHECKOUT_SESSION_ID}&event=${eventSlug}`),
    cancel_url: appUrl(`/e/${eventSlug}/admin`),
    metadata: {
      eventSlug,
      event_id: board.event.id,
      product: "organizer_premium",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PREMIUM_AMOUNT_CENTS,
          product_data: {
            name: PRODUCT_NAME,
            description: "CSV exports, sponsor branding, and the advanced matching report for organizers.",
          },
        },
      },
    ],
  });

  // Best-effort: record a pending payment for reconciliation (needs service role).
  const supabase = createSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from("payments").insert({
        event_id: board.event.id,
        stripe_checkout_session_id: session.id,
        buyer_email: payload.buyerEmail ?? null,
        amount_cents: PREMIUM_AMOUNT_CENTS,
        status: "pending",
      });
    } catch {
      // Non-fatal — the webhook upserts on completion anyway.
    }
  }

  return NextResponse.json({
    mode: "stripe",
    configured: true,
    id: session.id,
    url: session.url,
  });
}
