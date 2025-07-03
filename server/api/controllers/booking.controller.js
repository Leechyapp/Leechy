const TransitionEnum = require('../enums/transition.enum');
const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const SharetribeService = require('../services/sharetribe.service');
const StripeService = require('../services/stripe.service');
const TransactionLedgerService = require('../services/transaction-ledger.service');
const { types } = require('sharetribe-flex-sdk');
const ProcessAliasEnum = require('../enums/process-alias.enum');
const StripeUtil = require('../utils/stripe.util');
const { UUID, Money } = types;

class BookingController {
  static async createBookingRequest(req, res, next) {
    try {
      const { initialMessage, orderParams } = req.body;

      const { stripeCustomerId } = req.currentUser.attributes.profile.privateData || {};
      
      // Only set stripeCustomerId if it exists and payment type requires it
      const paymentType = orderParams.protectedData?.paymentType;
      console.log('🔧 Booking request - Payment type:', paymentType);
      console.log('🔧 Booking request - Has Stripe Customer ID:', !!stripeCustomerId);
      
      if (stripeCustomerId && (!paymentType || paymentType === 'card' || paymentType === 'saved_card' || paymentType === 'apple_pay' || paymentType === 'google_pay')) {
        orderParams.protectedData.stripeCustomerId = stripeCustomerId;
        console.log('✅ Added Stripe Customer ID to booking request');
      } else if (paymentType === 'paypal' || paymentType === 'venmo') {
        console.log('✅ PayPal/Venmo payment - skipping Stripe Customer ID requirement');
      } else {
        console.log('⚠️ No Stripe Customer ID available for card-based payment');
      }

      console.log('🔄 Initiating transaction with Sharetribe...');
      const initialTransition = await SharetribeService.transactionsInitiateDynamic(req, {
        processAlias: ProcessAliasEnum.DefaultBookingRelease1,
        transition: TransitionEnum.RequestPayment,
        params: orderParams,
      });
      
      if (initialTransition?.data?.errors) {
        console.error('❌ Initial transaction failed:', initialTransition.data.errors);
        return res.status(500).send(initialTransition?.data?.errors);
      }

      const transactionId = initialTransition.data.data.id;
      console.log('✅ Transaction initiated successfully:', transactionId);

      console.log('🔄 Confirming payment...');
      const transitionConfirmPaymentRes = await SharetribeService.transitionTransaction(req, res, {
        id: new UUID(transactionId.uuid),
        transition: TransitionEnum.ConfirmPayment,
        params: {},
      });
      
      if (transitionConfirmPaymentRes?.data?.errors) {
        console.error('❌ Payment confirmation failed:', transitionConfirmPaymentRes.data.errors);
        return res.status(500).send(transitionConfirmPaymentRes?.data?.errors);
      }
      
      console.log('✅ Payment confirmed successfully');

      if (initialMessage && transactionId) {
        await SharetribeService.sendMessage(req, res, transactionId.uuid, initialMessage);
      }

      res.send({ transactionId });
    } catch (e) {
      console.error('❌ Booking request failed with error:', e);
      console.error('❌ Error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      next(e);
    }
  }

  static async acceptBookingRequest(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (!stripeAccountId) {
        return res.status(400).send({ message: `stripe_account_not_found` });
      } else {
        const stripeAccount = await StripeService.retrieveAccount(stripeAccountId);
        if (stripeAccount && stripeAccount?.payouts_enabled === false) {
          return res.status(400).send({ message: `stripe_payouts_disabled` });
        }
      }

      const { transactionId } = req.body;
      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId);
      const transaction = await transactionRes.data;
      const { protectedData } = transaction.attributes;

      const { 
        stripeCustomerId, 
        stripePaymentMethodId, 
        payinTotal, 
        payoutTotal, 
        paymentType,
        paypalOrderId,
        paypalAuthorizationId,
        paypalCaptured 
      } = protectedData;

      console.log('🔧 Accept booking - Payment type:', paymentType);
      console.log('🔧 Accept booking - Has Stripe Payment Method ID:', !!stripePaymentMethodId);
      console.log('🔧 Accept booking - Has Stripe Customer ID:', !!stripeCustomerId);

      // Handle PayPal/Venmo payments differently - capture authorized payments
      if (paymentType === 'paypal' || paymentType === 'venmo') {
        console.log(`✅ Processing ${paymentType} payment acceptance - capturing authorized payment`);
        
        try {
          // Get customer and provider info from transaction or current user context
          let customerId = transaction.relationships?.customer?.data?.id?.uuid;
          let providerId = transaction.relationships?.provider?.data?.id?.uuid;
          
          // Fallback: Since the current user is accepting the booking, they must be the provider
          if (!providerId && req.currentUser?.id?.uuid) {
            providerId = req.currentUser.id.uuid;
            console.log('🔧 Using current user as provider ID:', providerId);
          }
          
          // For customer ID, we can try to extract from transaction attributes or protectedData
          if (!customerId) {
            // Try to get customer ID from transaction attributes or other sources
            customerId = transaction.attributes?.customer?.uuid || 
                        protectedData?.customerId || 
                        'unknown-customer';
            console.log('🔧 Fallback customer ID:', customerId);
          }
          
          console.log('🔧 Booking acceptance - Customer ID:', customerId);
          console.log('🔧 Booking acceptance - Provider ID:', providerId);
          console.log('🔧 Booking acceptance - Transaction relationships:', JSON.stringify(transaction.relationships, null, 2));
          console.log('🔧 Booking acceptance - Transaction attributes:', JSON.stringify(transaction.attributes, null, 2));
          
          if (paymentType === 'paypal' && paypalOrderId && paypalAuthorizationId) {
            // Check if payment is already captured
            if (paypalCaptured) {
              console.log('⚠️ PayPal payment already captured - recording existing payment');
              
              // If already captured, just record it in the ledger
              const paypalData = {
                orderId: paypalOrderId,
                paymentId: paypalAuthorizationId, // Use authorizationId as paymentId for already captured
                authorizationId: paypalAuthorizationId,
                amount: payinTotal.amount / 100, // Convert from cents to dollars
                currency: payinTotal.currency,
                order: protectedData.paypalOrder || {
                  update_time: new Date().toISOString(),
                  payer: {
                    email_address: 'unknown@paypal.com',
                  }
                },
                captured: true
              };
              
              // Extract line items from transaction for proper payout calculation
              const rawLineItems = protectedData.lineItems || transaction.attributes.lineItems;
              
              // Convert line items back to proper Money objects (they get serialized as plain objects)
              const lineItems = rawLineItems.map(item => ({
                ...item,
                unitPrice: new Money(item.unitPrice.amount, item.unitPrice.currency),
                lineTotal: new Money(item.lineTotal.amount, item.lineTotal.currency),
              }));
              
              await TransactionLedgerService.recordPayPalTransaction(
                paypalData,
                lineItems,
                providerId,
                customerId
              );
              
              console.log('✅ PayPal transaction recorded in unified ledger');
            } else {
              console.log('🔄 Capturing PayPal authorization on seller acceptance...');
              
              // Capture the authorization now that seller accepts
              const PayPalController = require('./paypal.controller');
              
              // Extract line items for capture payload
              const rawLineItems = protectedData.lineItems || transaction.attributes.lineItems;
              const lineItems = rawLineItems.map(item => ({
                ...item,
                unitPrice: new Money(item.unitPrice.amount, item.unitPrice.currency),
                lineTotal: new Money(item.lineTotal.amount, item.lineTotal.currency),
              }));
              
              const capturePayload = {
                amount: {
                  value: (payinTotal.amount / 100).toFixed(2),
                  currency: payinTotal.currency.toUpperCase()
                },
                transactionLineItems: lineItems,
                providerId,
                customerId
              };
              
              // Create mock request/response for PayPal controller
              const mockReq = {
                params: { authorizationId: paypalAuthorizationId },
                body: capturePayload,
                currentUser: req.currentUser
              };
              
              const mockRes = {
                json: (data) => {
                  console.log('✅ PayPal capture response:', data);
                  return data;
                }
              };
              
              await PayPalController.captureAuthorization(mockReq, mockRes, (error) => {
                if (error) throw error;
              });
              
              console.log('✅ PayPal authorization captured and recorded in ledger');
            }
          }
        } catch (ledgerError) {
          console.error('❌ Failed to capture/record PayPal transaction:', ledgerError);
          // Don't fail the acceptance - just log the error
        }
        
        // Update metadata to mark the booking as accepted
        await SharetribeIntegrationService.updateMetadata({
          id: new UUID(transactionId),
          metadata: {
            stripeAccountId,
            paymentType,
            paypalOrderId: paypalOrderId || null,
            paypalAuthorizationId: paypalAuthorizationId || null,
            paypalCaptured: true, // Mark as captured
            acceptedAt: new Date().toISOString(),
          },
        });

        console.log(`✅ ${paymentType} booking accepted successfully - payment captured and recorded`);
        res.send('This booking has been accepted.');
        return;
      }

      // For Stripe-based payments (cards, Apple Pay, Google Pay, saved cards)
      if (!stripePaymentMethodId) {
        console.error('❌ Missing Stripe payment method ID for Stripe-based payment');
        return res.status(400).send({ 
          message: 'Missing payment method for Stripe-based payment' 
        });
      }

      // Build PaymentIntent object for Stripe payments
      const paymentIntentObject = {
        amount: payinTotal.amount,
        currency: 'usd',
        payment_method_types: ['card'],
        payment_method: stripePaymentMethodId,
        description: `Transaction (ID: ${transactionId})`,
        transfer_data: {
          amount: payoutTotal.amount,
          destination: stripeAccountId,
        },
        metadata: {
          transactionId,
          paymentType,
        },
        confirm: true,
      };

      // Only add customer if we have a customer ID (for saved cards)
      if (stripeCustomerId) {
        paymentIntentObject.customer = stripeCustomerId;
        console.log('✅ Added Stripe Customer ID to PaymentIntent');
      } else {
        console.log('ℹ️ No Stripe Customer ID - processing as one-time payment');
      }

      console.log('🔄 Creating Stripe PaymentIntent for acceptance...');
      const paymentIntent = await StripeService.createPaymentIntent(paymentIntentObject);

      StripeUtil.checkIfPaymentIntentSucceeded(paymentIntent);

      // Record Stripe transaction in the unified ledger for tracking
      try {
        const customerId = transaction.relationships?.customer?.data?.id?.uuid;
        const providerId = transaction.relationships?.provider?.data?.id?.uuid;
        const rawLineItems = protectedData.lineItems || transaction.attributes.lineItems;
        
        // Convert line items back to proper Money objects (they get serialized as plain objects)
        const lineItems = rawLineItems.map(item => ({
          ...item,
          unitPrice: new Money(item.unitPrice.amount, item.unitPrice.currency),
          lineTotal: new Money(item.lineTotal.amount, item.lineTotal.currency),
        }));
        
        await TransactionLedgerService.recordStripeTransaction(
          paymentIntent,
          lineItems,
          providerId,
          customerId
        );
        
        console.log('✅ Stripe transaction recorded in unified ledger');
      } catch (ledgerError) {
        console.error('❌ Failed to record Stripe transaction in ledger:', ledgerError);
        // Don't fail the acceptance - just log the error
      }

      await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          stripeAccountId,
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge,
          paymentType,
        },
      });

      console.log('✅ Stripe payment accepted successfully');
      res.send('This booking has been accepted.');
    } catch (e) {
      console.error('❌ Accept booking request failed:', e);
      next(e);
    }
  }
}

module.exports = BookingController;
