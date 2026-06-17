import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://www.micoachdiabetes.com/app'
    });
    res.status(200).json({ url: session.url });
  } catch(e) {
    console.error('Error creando portal session:', e);
    res.status(500).json({ error: e.message });
  }
}
