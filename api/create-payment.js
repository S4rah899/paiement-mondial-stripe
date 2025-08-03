import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      payment_method_id,
    } = req.body;

    const cleanStr = (str) => (typeof str === "string" ? str.trim() : "");

    const pseudoTikTokClean = cleanStr(pseudoTikTok);
    const nomPrenomClean = cleanStr(nomPrenom);
    const adresseCompleteClean = cleanStr(adresseComplete);
    const telephoneClean = cleanStr(telephone);
    const numeroCommandeClean = cleanStr(numeroCommande);
    const pointRelaisIdClean = cleanStr(pointRelaisId);
    const paymentMethodIdClean = cleanStr(payment_method_id);

    const montantNumber = Number(montantTotal);

    // Validation essentielle (bloquante uniquement si nécessaire)
    if (
      !paymentMethodIdClean ||
      !montantNumber ||
      isNaN(montantNumber) ||
      montantNumber <= 0
    ) {
      return res.status(400).json({
        message: "Champs essentiels invalides (montant ou méthode de paiement).",
      });
    }

    // Paiement
    const amount = Math.round(montantNumber * 100); // en centimes

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: paymentMethodIdClean,
      confirmation_method: "manual",
      confirm: true,
      description: `Commande ${numeroCommandeClean} - Client: ${nomPrenomClean}`,
      metadata: {
        pseudoTikTok: pseudoTikTokClean,
        telephone: telephoneClean,
        adresseComplete: adresseCompleteClean,
        pointRelaisId: pointRelaisIdClean,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    if (
      paymentIntent.status === "requires_action" &&
      paymentIntent.next_action?.type === "use_stripe_sdk"
    ) {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    } else {
      return res
        .status(400)
        .json({ message: "Paiement non complété. Vérifiez la carte." });
    }
  } catch (error) {
    console.error("Erreur paiement Stripe:", error.message);
    return res
      .status(500)
      .json({ message: error.raw?.message || error.message || "Erreur serveur" });
  }
}
