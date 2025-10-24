// /api/create-payment.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function cleanStr(s, max = 200) {
  if (!s) return "";
  return String(s).trim().slice(0, max);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

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
    } = req.body || {};

    // clean
    const pseudo = cleanStr(pseudoTikTok, 50);
    const nom = cleanStr(nomPrenom, 100);
    const adresse = cleanStr(adresseComplete, 300);
    const tel = cleanStr(telephone, 30);
    const numCmd = cleanStr(numeroCommande, 80);
    const relais = cleanStr(pointRelaisId, 80);
    const paymentMethodId = cleanStr(payment_method_id, 200);

    const montant = Number(String(montantTotal).replace(",", "."));
    if (!paymentMethodId || !montant || isNaN(montant) || montant <= 0) {
      return res.status(400).json({ message: "Champs essentiels invalides." });
    }

    // amount in cents
    const amount = Math.round(montant * 100);

    // create PaymentIntent: automatic_payment_methods enabled but no redirects
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      payment_method: paymentMethodId,
      confirmation_method: "manual",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        pseudoTikTok: pseudo,
        nomPrenom: nom,
        adresseComplete: adresse,
        telephone: tel,
        numeroCommande: numCmd,
        pointRelaisId: relais,
      },
      description: `Commande ${numCmd} - ${nom}`,
    });

    // handle result
    if (paymentIntent.status === "requires_action" && paymentIntent.next_action?.type === "use_stripe_sdk") {
      return res.json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === "succeeded") {
      // save order to DB here if needed
      return res.json({ success: true });
    } else {
      return res.status(400).json({ message: "Paiement non complété." });
    }
  } catch (err) {
    console.error("create-payment error:", err);
    // hide raw Stripe error information from client for security
    const msg = err.raw?.message || err.message || "Erreur serveur Stripe";
    return res.status(500).json({ message: msg });
  }
};
