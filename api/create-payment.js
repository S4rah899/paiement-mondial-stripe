import Stripe from "stripe";
import dotenv from 'dotenv';
dotenv.config();

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

    // Fonction utilitaire pour nettoyer les strings
    const cleanStr = (str) => (typeof str === 'string' ? str.trim() : '');

    const pseudoTikTokClean = cleanStr(pseudoTikTok);
    const nomPrenomClean = cleanStr(nomPrenom);
    const adresseCompleteClean = cleanStr(adresseComplete);
    const telephoneClean = cleanStr(telephone);
    const numeroCommandeClean = cleanStr(numeroCommande);
    const pointRelaisIdClean = cleanStr(pointRelaisId);
    const paymentMethodIdClean = cleanStr(payment_method_id);

    const montantNumber = Number(montantTotal);

    // Validation souple - on avertit mais on ne bloque que si champs essentiels manquants
    if (
      !pseudoTikTokClean ||
      !nomPrenomClean ||
      !adresseCompleteClean ||
      !telephoneClean ||
      !numeroCommandeClean ||
      !pointRelaisIdClean ||
      !paymentMethodIdClean ||
      !montantNumber || isNaN(montantNumber) || montantNumber <= 0
    ) {
      console.warn('Validation souple : certains champs manquent ou sont invalides', {
        pseudoTikTok: pseudoTikTokClean,
        nomPrenom: nomPrenomClean,
        adresseComplete: adresseCompleteClean,
        telephone: telephoneClean,
        numeroCommande: numeroCommandeClean,
        pointRelaisId: pointRelaisIdClean,
        payment_method_id: paymentMethodIdClean,
        montantTotal,
      });

      // Bloquer seulement si payment_method_id ou montant invalides
      if (!paymentMethodIdClean || !montantNumber || isNaN(montantNumber) || montantNumber <= 0) {
        return res.status(400).json({ message: "Champs essentiels invalides" });
      }
    }

    const amount = Math.round(montantNumber * 100);

    // Création du PaymentIntent Stripe
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
    console.error("Erreur API paiement:", error.message, error.raw ? error.raw.message : '');
    return res.status(500).json({ message: error.message || "Erreur serveur" });
  }
}
