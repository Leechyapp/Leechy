const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { verifyCaptchaStrict } = require('../middlewares/captcha.middleware');

// Create Stripe Checkout Session for Google Pay
router.post('/create-checkout-session', verifyCaptchaStrict, async (req, res) => {
  try {
    const { 
      amount, 
      currency = 'usd', 
      payment_method_types = ['card', 'google_pay'],
      mode = 'payment',
      success_url,
      cancel_url,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!amount || !success_url || !cancel_url) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, success_url, cancel_url' 
      });
    }

    // Convert amount to cents if it's in dollars
    const amountInCents = typeof amount === 'string' 
      ? Math.round(parseFloat(amount.replace(/[^0-9.-]+/g, '')) * 100)
      : amount;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types,
      mode,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Leechy Booking Payment',
              description: 'Payment for booking services',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url,
      cancel_url,
      metadata: {
        source: 'mobile_google_pay_fallback',
        ...metadata
      },
      // Enable Google Pay in Checkout
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
      // Ensure Google Pay is available
      automatic_tax: {
        enabled: false,
      },
      billing_address_collection: 'auto',
      shipping_address_collection: null, // Disable shipping for services
    });

    console.log('✅ Stripe Checkout session created:', session.id);

    res.json({
      id: session.id,
      url: session.url,
      payment_intent: session.payment_intent,
    });

  } catch (error) {
    console.error('❌ Error creating Stripe Checkout session:', error);
    
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
});

// Verify Checkout Session completion
router.get('/verify-session/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'customer'],
    });

    console.log('✅ Stripe Checkout session retrieved:', session.id, 'Status:', session.payment_status);

    res.json({
      id: session.id,
      payment_status: session.payment_status,
      payment_intent: session.payment_intent,
      customer: session.customer,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    });

  } catch (error) {
    console.error('❌ Error verifying Stripe Checkout session:', error);
    
    res.status(500).json({
      error: 'Failed to verify checkout session',
      message: error.message,
    });
  }
});

module.exports = router; 