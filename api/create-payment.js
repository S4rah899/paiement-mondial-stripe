const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { amount, payment_method_id } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount),
      currency: "eur",
      payment_method: payment_method_id,
      confirmation_method: "manual",
      confirm: true,
    });

    if (
      paymentIntent.status === "requires_action" &&
      paymentIntent.next_action.type === "use_stripe_sdk"
    ) {
      return res.status(200).json({
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === "succeeded") {
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({
        success: false,
        message: "Le paiement n'a pas abouti",
      });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
