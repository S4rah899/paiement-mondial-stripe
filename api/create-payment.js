import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { montantTotal, nomPrenom, pointRelaisId } = req.body;

    if (!montantTotal || !nomPrenom || !pointRelaisId) {
      return res.status(400).json({ message: "Données manquantes" });
    }

    const amount = Math.round(parseFloat(montantTotal) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: { nomPrenom, pointRelaisId }
    });

    return res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error("Erreur Stripe:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
