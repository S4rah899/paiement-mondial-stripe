// create-payment.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, currency = 'eur', metadata = {} } = req.body || {};
    if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Amount missing or invalid' });

    // Stripe expects amount in the smallest currency unit (cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true }
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-payment error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
