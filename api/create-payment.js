import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // clé live dans Vercel ENV

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const {
      pseudoTikTok,
      nomPrenom,
      adresseComplete,
      telephone,
      numeroCommande,
      montantTotal,
      pointRelaisId,
      payment_method_id
    } = req.body;

    if (!nomPrenom || !montantTotal || !payment_method_id) {
      return res.status(400).json({ message: "Champs essentiels manquants" });
    }

    const montant = Math.round(parseFloat(montantTotal) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montant,
      currency: "eur",
      payment_method: payment_method_id,
      confirmation_method: "manual",
      confirm: true,
      description: `Commande ${numeroCommande} - Client: ${nomPrenom}`,
      metadata: {
        pseudoTikTok: pseudoTikTok || "",
        telephone: telephone || "",
        adresseComplete: adresseComplete || "",
        pointRelaisId: pointRelaisId || ""
      },
      automatic_payment_methods: { enabled: true, allow_redirects: "never" }
    });

    if (
      paymentIntent.status === "requires_action" &&
      paymentIntent.next_action?.type === "use_stripe_sdk"
    ) {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret
      });
    } else if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: "Paiement échoué" });
    }
  } catch (err) {
    console.error("Erreur paiement:", err);
    return res.status(500).json({ message: err.message });
  }
}
