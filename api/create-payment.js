// api/create-payment.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET);

// --- Fonction utilitaire sûre pour convertir le montant ---
function normalizeAmount(input) {
  if (!input) return 0;
  if (typeof input !== "string") input = String(input);
  input = input.trim().replace(",", ".").replace(/[^\d.]/g, "");
  const value = parseFloat(input);
  return isNaN(value) ? 0 : value;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const {
      montantTotal,
      payment_method_id,
      pseudoTikTok,
      nomPrenom,
      adresseComplete,
      telephone,
      numeroCommande,
      pointRelaisId
    } = req.body;

    // --- Vérifications et nettoyage ---
    const totalValue = normalizeAmount(montantTotal);
    const fraisMin = 5.0; // frais de port obligatoires
    const finalValue = totalValue < fraisMin ? fraisMin : totalValue;

    if (!payment_method_id) {
      return res.status(400).json({ error: "Méthode de paiement manquante." });
    }

    if (finalValue < 1) {
      return res.status(400).json({ error: "Montant trop faible ou invalide." });
    }

    const amount = Math.round(finalValue * 100);

    // --- Création du PaymentIntent ---
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
      }
    });

    console.log("💳 Stripe PaymentIntent status:", paymentIntent.status);

    // --- Gestion des états du paiement ---
    if (paymentIntent.status === "requires_action") {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret
      });
    }

    if (paymentIntent.status === "succeeded") {
      return res.json({ success: true });
    }

    // Tous les autres cas = échec
    return res.json({
      error: "Paiement échoué ou non confirmé.",
      status: paymentIntent.status
    });

  } catch (err) {
    console.error("❌ Erreur Stripe :", err.message);
    return res.status(500).json({ error: err.message });
  }
}
