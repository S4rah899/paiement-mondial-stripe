import Stripe from "stripe";

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      automatic_payment_methods: { enabled: true }
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error("Erreur Stripe :", error.message);
    return res.status(500).json({ message: error.message });
  }
}
