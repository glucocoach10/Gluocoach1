import pkg from 'firebase-admin';
const { credential } = pkg;
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

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

  try {
    let email = data.customer_email || data.customer_details?.email;

    // Si no viene el email directo, lo buscamos en el customer de Stripe
    if (!email && data.customer) {
      const customer = await stripe.customers.retrieve(data.customer);
      email = customer.email;
    }

    if (!email) {
      console.log('No se encontró email para este evento:', event.type);
      return res.status(200).json({ received: true, warning: 'no email found' });
    }

    const usersSnap = await db.collection('users').where('email', '==', email).get();

    if (usersSnap.empty) {
      console.log('No se encontró usuario con email:', email);
      return res.status(200).json({ received: true, warning: 'user not found' });
    }

    const userDoc = usersSnap.docs[0];

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'invoice.payment_succeeded':
        await userDoc.ref.update({
          subscriptionStatus: 'active',
          subscriptionId: data.id || data.subscription || null,
          stripeCustomerId: data.customer || null,
          updatedAt: new Date()
        });
        console.log('Usuario activado:', email);
        break;

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        await userDoc.ref.update({
          subscriptionStatus: 'inactive',
          updatedAt: new Date()
        });
        console.log('Usuario desactivado:', email);
        break;
    }
  } catch(e) {
    console.error('Error procesando webhook:', e);
  }

  res.status(200).json({ received: true });
}

export const config = { api: { bodyParser: false } };
