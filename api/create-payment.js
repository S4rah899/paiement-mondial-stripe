import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { pseudoTikTok, nomPrenom, adresseComplete, telephone, numeroCommande, montantTotal, pointRelaisId, payment_method_id } = req.body;

    if (!pseudoTikTok || !nomPrenom || !adresseComplete || !telephone || !numeroCommande || !pointRelaisId || !payment_method_id || !montantTotal) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const amount = Math.round(Number(montantTotal) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: payment_method_id,
      confirmation_method: "manual",
      confirm: true,
      description: `Commande ${numeroCommande} - Client: ${nomPrenom}`,
      metadata: { pseudoTikTok, telephone, adresseComplete, pointRelaisId }
    });

    if (paymentIntent.status === "requires_action" && paymentIntent.next_action?.type === "use_stripe_sdk") {
      return res.json({ requires_action: true, payment_intent_client_secret: paymentIntent.client_secret });
    } else if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: "Paiement échoué" });
    }
  } catch (err) {
    console.error("Erreur Stripe :", err);
    return res.status(500).json({ message: err.message || "Erreur serveur" });
  }
}
