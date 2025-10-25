// api/create-payment.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { montantTotal, payment_method_id, pseudoTikTok, nomPrenom, adresseComplete, telephone, numeroCommande, pointRelaisId } = req.body;

    if (!montantTotal || !payment_method_id) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const amount = Math.round(parseFloat(montantTotal) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: payment_method_id,
      confirmation_method: "manual",
      confirm: true,
      metadata: {
        pseudoTikTok,
        nomPrenom,
        adresseComplete,
        telephone,
        numeroCommande,
        pointRelaisId
      },
    });

    if (paymentIntent.status === "requires_action") {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    } else {
      return res.json({ error: "Paiement non complété." });
    }
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
