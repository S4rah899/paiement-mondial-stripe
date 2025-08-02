// create-payment.js

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Ta clé secrète Stripe dans .env

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

    if (
      !pseudoTikTok ||
      !nomPrenom ||
      !adresseComplete ||
      !telephone ||
      !numeroCommande ||
      !montantTotal ||
      !pointRelaisId ||
      !payment_method_id
    ) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    // Montant en centimes
    const amount = Math.round(parseFloat(montantTotal) * 100);

    // Création du PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: payment_method_id,
      confirmation_method: "manual",
      confirm: true,
      description: `Commande ${numeroCommande} - Client: ${nomPrenom}`,
      metadata: {
        pseudoTikTok,
        telephone,
        adresseComplete,
        pointRelaisId,
      },
    });

    // Vérifier le statut de paiement
    if (
      paymentIntent.status === "requires_action" &&
      paymentIntent.next_action.type === "use_stripe_sdk"
    ) {
      // Nécessite une action supplémentaire (ex: 3D Secure)
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === "succeeded") {
      // Paiement réussi - ici tu peux enregistrer la commande en base
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: "Paiement échoué" });
    }
  } catch (error) {
    console.error("Erreur API paiement:", error);
    return res.status(500).json({ message: error.message || "Erreur serveur" });
  }
}
