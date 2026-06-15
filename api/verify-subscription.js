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

  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: 'Missing data' });

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const now = new Date();

    if (!userDoc.exists) {
      await userRef.set({
        userId,
        email,
        createdAt: now,
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      });
      return res.status(200).json({ status: 'trial', daysLeft: 7 });
    }

    const userData = userDoc.data();

    if (userData.subscriptionStatus === 'active') {
      return res.status(200).json({ status: 'active' });
    }

    if (userData.subscriptionStatus === 'trial') {
      const trialEndsAt = userData.trialEndsAt?.toDate ? userData.trialEndsAt.toDate() : new Date(userData.trialEndsAt);
      const daysLeft = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return res.status(200).json({ status: 'trial', daysLeft });
      } else {
        await userRef.update({ subscriptionStatus: 'expired' });
        return res.status(200).json({ status: 'expired' });
      }
    }

    return res.status(200).json({ status: 'expired' });

  } catch(e) {
    console.error('Error:', e);
    return res.status(500).json({ error: 'Server error', details: e.message });
  }
}
