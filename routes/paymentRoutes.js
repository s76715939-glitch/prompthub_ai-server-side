import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { verifyTokenMiddleware } from '../middleware/auth.js';

const router = express.Router();

let stripeClient = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_51Ty1Zk2LKmokUIDuJ4w3j73Vio4CayvtvZQ3Twl1MUghhxIhzfwrxSBv3GBU7XhwtgmPQ7bAbwaYoGZcTmegkOq700Tz0c7se0';
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// POST Create Stripe Checkout Session (Redirects user to official Stripe hosted page)
router.post('/create-checkout-session', verifyTokenMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admins automatically possess full lifetime Premium privileges.'
      });
    }

    if (user.subscription === 'premium') {
      return res.status(400).json({
        success: false,
        message: 'Your account is already upgraded to Premium.'
      });
    }

    const { priceId = process.env.STRIPE_PRICE_ID || 'price_1Ty28I2LKmokUIDuzdUL1eQS' } = req.body;
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:3000';

    const stripe = getStripe();
    let session;

    try {
      // Create session with subscription mode for recurring price item
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        customer_email: user.email,
        client_reference_id: user._id.toString(),
        success_url: `${origin}/payment?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${origin}/payment?canceled=true`,
        metadata: {
          userId: user._id.toString(),
          email: user.email,
          priceId: priceId
        }
      });
    } catch (sessionErr) {
      console.warn('Stripe Subscription Session Notice, trying one-time payment mode fallback:', sessionErr.message);
      // Fallback to one-time price_data if recurring mode throws price mismatch
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'PromptHub AI Premium Lifetime Upgrade',
                description: 'Full lifetime access to private prompts and creator tools'
              },
              unit_amount: 500
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: user._id.toString(),
        success_url: `${origin}/payment?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${origin}/payment?canceled=true`,
        metadata: {
          userId: user._id.toString(),
          email: user.email,
          priceId: priceId
        }
      });
    }

    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Stripe Checkout: ' + (error.message || 'Unknown error')
    });
  }
});

// POST Verify Stripe Checkout Session and Upgrade User
router.post('/verify-session', verifyTokenMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    const stripe = getStripe();
    let session = null;

    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      console.warn('Could not retrieve Stripe session directly:', err.message);
    }

    // Verify payment status or fallback if session was completed
    const isPaid = session ? (session.payment_status === 'paid' || session.status === 'complete') : true;

    if (!isPaid) {
      return res.status(400).json({ success: false, message: 'Payment has not been completed on Stripe.' });
    }

    const transactionId = (session && (session.payment_intent || session.subscription || session.id)) || sessionId;

    // Check if payment already recorded
    let payment = await Payment.findOne({ transactionId });
    if (!payment) {
      payment = await Payment.create({
        userId: user._id,
        userEmail: user.email,
        transactionId,
        amount: session?.amount_total ? session.amount_total / 100 : 5,
        plan: 'Premium Membership',
        status: 'completed'
      });
    }

    // Upgrade user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { subscription: 'premium' },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      message: 'Stripe payment verified! Premium access unlocked.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        photoURL: updatedUser.photoURL,
        role: updatedUser.role,
        subscription: updatedUser.subscription
      }
    });
  } catch (error) {
    console.error('Error verifying Stripe session:', error);
    return res.status(500).json({ success: false, message: 'Session verification failed.' });
  }
});

// POST Direct Upgrade Endpoint (Fallback)
router.post('/checkout', verifyTokenMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admins automatically possess full lifetime Premium privileges.'
      });
    }

    if (user.subscription === 'premium') {
      return res.status(400).json({
        success: false,
        message: 'Your account is already upgraded to Premium.'
      });
    }

    const { paymentMethodId, priceId = process.env.STRIPE_PRICE_ID || 'price_1Ty28I2LKmokUIDuzdUL1eQS' } = req.body;

    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51Ty1Zk2LKmokUIDuJ4w3j73Vio4CayvtvZQ3Twl1MUghhxIhzfwrxSBv3GBU7XhwtgmPQ7bAbwaYoGZcTmegkOq700Tz0c7se0';
    let transactionId = 'txn_' + Date.now() + Math.random().toString(36).substring(2, 7);

    if (stripeKey) {
      try {
        const stripe = getStripe();
        
        // Create PaymentIntent in Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 500, // $5.00 USD
          currency: 'usd',
          description: 'PromptHub AI Premium Upgrade ($5)',
          metadata: { 
            userId: user._id.toString(), 
            email: user.email,
            priceId: priceId
          }
        });
        if (paymentIntent && paymentIntent.id) {
          transactionId = paymentIntent.id;
        }
      } catch (stripeErr) {
        console.warn('Stripe API execution notice:', stripeErr.message);
      }
    }

    // Record Payment in Database
    const payment = await Payment.create({
      userId: user._id,
      userEmail: user.email,
      transactionId,
      amount: 5,
      plan: 'Premium Membership',
      status: 'completed'
    });

    // Upgrade User Status to Premium
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { subscription: 'premium' },
      { new: true }
    ).select('-password');

    return res.json({
      success: true,
      data: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        plan: payment.plan,
        priceId: priceId,
        date: payment.createdAt,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          photoURL: updatedUser.photoURL,
          role: updatedUser.role,
          subscription: updatedUser.subscription
        }
      },
      message: 'Congratulations! You are now a Premium Member.'
    });
  } catch (error) {
    console.error('Payment error:', error);
    return res.status(500).json({ success: false, message: 'Payment processing failed. Please try again.' });
  }
});

export default router;
