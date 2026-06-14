import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appUrl } from "@/lib/utils";

const premiumAmountCents = 4900;

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    eventSlug?: string;
    buyerEmail?: string;
  };
  const eventSlug = payload.eventSlug ?? "world-cup-hack";

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      mode: "demo",
      url: appUrl("/checkout/success?demo=1"),
      message: "STRIPE_SECRET_KEY is missing. Returning a demo success URL.",
      todo: "Configure Stripe test keys and persist payments rows when Checkout sessions are created.",
    });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: payload.buyerEmail,
    success_url: appUrl(`/checkout/success?session_id={CHECKOUT_SESSION_ID}&event=${eventSlug}`),
    cancel_url: appUrl(`/e/${eventSlug}/admin`),
    metadata: {
      eventSlug,
      product: "organizer_premium",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: premiumAmountCents,
          product_data: {
            name: "ScoutBoard organizer premium",
            description: "Premium dashboard for the live transfer market.",
          },
        },
      },
    ],
  });

  return NextResponse.json({
    mode: "stripe",
    id: session.id,
    url: session.url,
    todo: "Store the pending payment row with stripe_checkout_session_id for reconciliation.",
  });
}
