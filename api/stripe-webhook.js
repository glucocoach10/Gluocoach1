import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

if (!getApps().length) {
  initializeApp({
    credential: credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;

  switch (event.type) {
    case 'customer.subscription.created':
    case 'invoice.payment_succeeded':
      await db.collection('users').doc(data.customer).set({
        subscriptionStatus: 'active',
        subscriptionId: data.id || data.subscription,
        updatedAt: new Date()
      }, { merge: true });
      break;

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed':
      await db.collection('users').doc(data.customer).set({
        subscriptionStatus: 'inactive',
        updatedAt: new Date()
      }, { merge: true });
      break;
  }

  res.status(200).json({ received: true });
}

export const config = { api: { bodyParser: false } };
