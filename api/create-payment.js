const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send("Méthode non autorisée");
  }

  const {
    montantTotal,
    pseudoTikTok,
    nomPrenom,
    adresseComplete,
    telephone,
    numeroCommande,
    pointRelaisId,
    paymentMethodId
  } = req.body;

  if (!montantTotal || !paymentMethodId) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(montantTotal) * 100), // conversion en centimes
      currency: "eur",
      payment_method: paymentMethodId,
      confirmation_method: "automatic",
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

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error("Erreur Stripe :", error);
    return res.status(500).json({
      error: error.message || "Erreur serveur"
    });
  }
};
