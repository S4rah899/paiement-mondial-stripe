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
      payment_method_id
    } = req.body;

    // Nettoyage et validation
    const cleanStr = (s) => (typeof s === "string" ? s.trim() : "");
    const nomClean = cleanStr(nomPrenom);
    const montantNumber = parseFloat(montantTotal);
    const paymentMethodClean = cleanStr(payment_method_id);
    const pointRelaisClean = cleanStr(pointRelaisId);

    if (!nomClean || !montantNumber || isNaN(montantNumber) || montantNumber <= 0 || !paymentMethodClean || !pointRelaisClean) {
      return res.status(400).json({ message: "Champs essentiels invalides" });
    }

    const amount = Math.round(montantNumber * 100);

    // Création du PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: paymentMethodClean,
      confirmation_method: "manual",
      confirm: true,
      description: `Commande ${numeroCommande} - ${nomClean}`,
      metadata: {
        pseudoTikTok: cleanStr(pseudoTikTok),
        telephone: cleanStr(telephone),
        adresseComplete: cleanStr(adresseComplete),
        pointRelaisId: pointRelaisClean
      }
    });

    // Gestion 3D Secure
    if (paymentIntent.status === "requires_action" && paymentIntent.next_action?.type === "use_stripe_sdk") {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret
      });
    }

    // Paiement réussi
    if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    }

    return res.status(400).json({ message: "Paiement échoué" });

  } catch (error) {
    console.error("Erreur paiement:", error.message, error.raw?.message || '');
    return res.status(500).json({ message: error.message || "Erreur serveur" });
  }
}
