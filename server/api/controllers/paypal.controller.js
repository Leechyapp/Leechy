const PayPalService = require('../services/paypal.service');
const TransactionLedgerService = require('../services/transaction-ledger.service');
const PayPalTransactionHandlerService = require('../services/paypal-transaction-handler.service');

class PayPalController {
  /**
   * Create a PayPal order
   */
  static createOrder = async (req, res, next) => {
    try {
      console.log('🔧 PayPal createOrder - Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 PayPal createOrder - Body type:', typeof req.body);
      console.log('🔧 PayPal createOrder - Content-Type:', req.get('Content-Type'));
      console.log('🔧 PayPal createOrder - User:', req.currentUser?.id?.uuid || 'Not authenticated');

      const { amount, currency, description, metadata } = req.body;

      // Validate required fields
      if (!amount) {
        console.log('❌ PayPal createOrder - Missing amount field');
        return res.status(400).json({ 
          error: 'Missing required field: amount' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        console.log('❌ PayPal createOrder - PayPal not configured');
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const orderData = {
        amount,
        currency: currency || 'USD',
        description: description || 'Leechy Booking Payment',
        metadata: {
          ...metadata,
          userId: req.currentUser?.id?.uuid || 'anonymous',
          userEmail: req.currentUser?.attributes?.email || 'anonymous'
        }
      };

      console.log('🔧 PayPal createOrder - Order data:', JSON.stringify(orderData, null, 2));

      const order = await PayPalService.createOrder(orderData);

      res.json({
        success: true,
        orderId: order.id,
        status: order.status,
        links: order.links,
        order: order
      });

    } catch (error) {
      console.error('❌ PayPal create order error:', error);
      
      // Provide more specific error responses
      if (error.message.includes('Failed to authenticate with PayPal')) {
        return res.status(503).json({
          error: 'PayPal service temporarily unavailable. Please try again later.'
        });
      } else if (error.message.includes('Failed to create PayPal order')) {
        return res.status(400).json({
          error: 'Invalid payment details. Please check your information and try again.'
        });
      }
      
      next(error);
    }
  };

  /**
   * Authorize a PayPal order (new flow - no capture yet)
   */
  static authorizeOrder = async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { transactionLineItems, providerId, customerId } = req.body;
      
      console.log('🔧 PayPal authorizeOrder - Order ID:', orderId);
      console.log('🔧 PayPal authorizeOrder - User:', req.currentUser?.id?.uuid || 'Not authenticated');
      console.log('🔧 PayPal authorizeOrder - Transaction Line Items:', transactionLineItems);
      console.log('🔧 PayPal authorizeOrder - Provider ID:', providerId);

      if (!orderId) {
        return res.status(400).json({ 
          error: 'Order ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const authorizedOrder = await PayPalService.authorizeOrder(orderId);

      // Extract authorization information (not captured yet)
      const authorizationInfo = {
        orderId: authorizedOrder.id,
        authorizationId: authorizedOrder.purchase_units[0]?.payments?.authorizations[0]?.id,
        amount: authorizedOrder.purchase_units[0]?.amount?.value,
        currency: authorizedOrder.purchase_units[0]?.amount?.currency_code,
        status: authorizedOrder.status,
        payer: authorizedOrder.payer,
        order: authorizedOrder,
        authorizationStatus: authorizedOrder.purchase_units[0]?.payments?.authorizations[0]?.status,
        captured: false // Important: money is NOT captured yet
      };

      console.log('✅ PayPal order authorized (not captured):', authorizationInfo);
      console.log('💡 Money will be captured when seller accepts the booking');

      // Don't record in ledger yet - only when seller accepts and payment is captured
      console.log('⏳ PayPal authorization stored - awaiting seller acceptance for capture');

      res.json({
        success: true,
        order: authorizedOrder,
        authorization: authorizationInfo,
        captured: false,
        message: 'Payment authorized - will be captured when seller accepts'
      });

    } catch (error) {
      console.error('❌ PayPal authorizeOrder error:', error);
      res.status(500).json({
        error: 'Failed to authorize PayPal order',
        details: error.message
      });
    }
  };

  /**
   * Capture a PayPal order (DEPRECATED - keeping for backward compatibility)
   */
  static captureOrder = async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { transactionLineItems, providerId, customerId } = req.body;
      
      console.log('🔧 PayPal captureOrder - Order ID:', orderId);
      console.log('🔧 PayPal captureOrder - User:', req.currentUser?.id?.uuid || 'Not authenticated');
      console.log('🔧 PayPal captureOrder - Transaction Line Items:', transactionLineItems);
      console.log('🔧 PayPal captureOrder - Provider ID:', providerId);

      if (!orderId) {
        return res.status(400).json({ 
          error: 'Order ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const capturedOrder = await PayPalService.captureOrder(orderId);

      // Extract payment information
      const paymentInfo = {
        orderId: capturedOrder.id,
        paymentId: capturedOrder.purchase_units[0]?.payments?.captures[0]?.id,
        amount: capturedOrder.purchase_units[0]?.amount?.value,
        currency: capturedOrder.purchase_units[0]?.amount?.currency_code,
        status: capturedOrder.status,
        payer: capturedOrder.payer,
        order: capturedOrder
      };

      console.log('✅ PayPal order captured successfully:', paymentInfo);

      // **NEW: Record transaction in ledger for future payouts**
      if (transactionLineItems && providerId) {
        try {
          const ledgerEntry = await TransactionLedgerService.recordPayPalTransaction(
            paymentInfo,
            transactionLineItems,
            providerId,
            customerId || req.currentUser?.id?.uuid
          );
          
          console.log('📋 PayPal transaction recorded in ledger:', ledgerEntry);
          
          // Include ledger info in response
          paymentInfo.ledgerEntry = {
            payoutTotal: ledgerEntry.payoutTotal,
            platformFee: ledgerEntry.platformFee,
            paymentMethod: 'paypal'
          };
          
        } catch (ledgerError) {
          console.error('❌ Failed to record PayPal transaction in ledger:', ledgerError);
          // Don't fail the payment capture, just log the error
        }
      } else {
        console.warn('⚠️ PayPal transaction captured but not recorded in ledger - missing line items or provider ID');
      }

      res.json({
        success: true,
        order: capturedOrder,
        payment: paymentInfo
      });

    } catch (error) {
      console.error('❌ PayPal captureOrder error:', error);
      res.status(500).json({
        error: 'Failed to capture PayPal order',
        details: error.message
      });
    }
  };

  /**
   * Capture an authorization when seller accepts
   */
  static captureAuthorization = async (req, res, next) => {
    try {
      const { authorizationId } = req.params;
      const { amount, transactionLineItems, providerId, customerId } = req.body;
      
      console.log('🔧 PayPal captureAuthorization - Authorization ID:', authorizationId);
      console.log('🔧 PayPal captureAuthorization - User:', req.currentUser?.id?.uuid || 'Not authenticated');
      console.log('🔧 PayPal captureAuthorization - Amount:', amount);
      console.log('🔧 PayPal captureAuthorization - Full req.body:', JSON.stringify(req.body, null, 2));
      console.log('🔧 PayPal captureAuthorization - Extracted providerId:', providerId);
      console.log('🔧 PayPal captureAuthorization - Extracted customerId:', customerId);

      if (!authorizationId) {
        return res.status(400).json({ 
          error: 'Authorization ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const captureResult = await PayPalService.captureAuthorization(authorizationId, amount);

      // Extract payment information in format expected by TransactionLedgerService
      const paymentInfo = {
        // Keep original capture info
        captureId: captureResult.id,
        authorizationId: authorizationId,
        status: captureResult.status,
        capturedAt: new Date().toISOString(),
        captured: true,
        
        // Add fields expected by ledger service
        orderId: authorizationId, // Use authorizationId as orderId for ledger tracking
        paymentId: captureResult.id, // Use captureId as paymentId
        amount: parseFloat(captureResult.amount?.value || amount?.value || '0'),
        currency: captureResult.amount?.currency_code || amount?.currency || 'USD',
        
        // Add order structure for ledger compatibility
        order: {
          update_time: new Date().toISOString(),
          payer: {
            email_address: 'unknown@paypal.com', // Will be overridden by proper seller email
          }
        }
      };

      console.log('✅ PayPal authorization captured on seller acceptance:', paymentInfo);

      // Record in ledger now that payment is actually captured
      if (transactionLineItems && providerId) {
        try {
          console.log('🔧 About to record PayPal transaction in ledger...');
          console.log('🔧 Payment Info:', JSON.stringify(paymentInfo, null, 2));
          console.log('🔧 Transaction Line Items:', JSON.stringify(transactionLineItems, null, 2));
          console.log('🔧 Provider ID:', providerId);
          console.log('🔧 Customer ID:', customerId || req.currentUser?.id?.uuid);
          
          const ledgerEntry = await TransactionLedgerService.recordPayPalTransaction(
            paymentInfo,
            transactionLineItems,
            providerId,
            customerId || req.currentUser?.id?.uuid
          );
          
          console.log('📋 PayPal transaction recorded in ledger on acceptance:', ledgerEntry);
          
          // Include ledger info in response
          paymentInfo.ledgerEntry = {
            payoutTotal: ledgerEntry.payoutTotal,
            platformFee: ledgerEntry.platformFee,
            paymentMethod: 'paypal'
          };
          
        } catch (ledgerError) {
          console.error('❌ Failed to record PayPal transaction in ledger:', ledgerError);
          console.error('❌ Ledger error stack:', ledgerError.stack);
          // Don't fail the payment capture, just log the error
        }
      } else {
        console.log('⚠️ PayPal transaction captured but not recorded in ledger:');
        console.log('⚠️ - Has transaction line items:', !!transactionLineItems);
        console.log('⚠️ - Has provider ID:', !!providerId);
        console.log('⚠️ - Transaction line items:', transactionLineItems);
        console.log('⚠️ - Provider ID:', providerId);
      }

      res.json({
        success: true,
        capture: captureResult,
        payment: paymentInfo,
        message: 'Payment captured successfully on seller acceptance'
      });

    } catch (error) {
      console.error('❌ PayPal captureAuthorization error:', error);
      res.status(500).json({
        error: 'Failed to capture PayPal authorization',
        details: error.message
      });
    }
  };

  /**
   * Void an authorization when seller declines
   */
  static voidAuthorization = async (req, res, next) => {
    try {
      const { authorizationId } = req.params;
      
      console.log('🔧 PayPal voidAuthorization - Authorization ID:', authorizationId);
      console.log('🔧 PayPal voidAuthorization - User:', req.currentUser?.id?.uuid || 'Not authenticated');

      if (!authorizationId) {
        return res.status(400).json({ 
          error: 'Authorization ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const voidResult = await PayPalService.voidAuthorization(authorizationId);

      console.log('✅ PayPal authorization voided on seller decline:', voidResult);

      res.json({
        success: true,
        void: voidResult,
        message: 'Authorization voided - no charge to customer'
      });

    } catch (error) {
      console.error('❌ PayPal voidAuthorization error:', error);
      res.status(500).json({
        error: 'Failed to void PayPal authorization',
        details: error.message
      });
    }
  };

  /**
   * Get order details
   */
  static getOrder = async (req, res, next) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ 
          error: 'Order ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const order = await PayPalService.getOrder(orderId);

      res.json({
        success: true,
        order: order
      });

    } catch (error) {
      console.error('❌ PayPal get order error:', error);
      next(error);
    }
  };

  /**
   * Process PayPal refund
   */
  static refundPayment = async (req, res, next) => {
    try {
      const { captureId } = req.params;
      const { amount, currency, reason } = req.body;

      if (!captureId) {
        return res.status(400).json({ 
          error: 'Capture ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const refundData = {
        amount,
        currency: currency || 'USD',
        reason: reason || 'Refund requested'
      };

      const refund = await PayPalService.refundPayment(captureId, refundData);

      res.json({
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
        refund: refund
      });

    } catch (error) {
      console.error('❌ PayPal refund error:', error);
      next(error);
    }
  };

  /**
   * Void PayPal authorization for a booking (when declined/expired)
   */
  static voidBookingAuthorization = async (req, res, next) => {
    try {
      const { transactionId } = req.params;
      
      console.log('🔧 PayPal voidBookingAuthorization - Transaction ID:', transactionId);
      console.log('🔧 PayPal voidBookingAuthorization - User:', req.currentUser?.id?.uuid || 'Not authenticated');

      if (!transactionId) {
        return res.status(400).json({ 
          error: 'Transaction ID is required' 
        });
      }

      // Check if PayPal is configured
      if (!PayPalService.isConfigured()) {
        return res.status(503).json({
          error: 'PayPal is not configured on this server'
        });
      }

      const voidResult = await PayPalTransactionHandlerService.handleBookingDecline(transactionId, req);

      console.log('✅ PayPal booking authorization void result:', voidResult);

      res.json({
        success: true,
        ...voidResult
      });

    } catch (error) {
      console.error('❌ PayPal voidBookingAuthorization error:', error);
      res.status(500).json({
        error: 'Failed to void PayPal booking authorization',
        details: error.message
      });
    }
  };

  /**
   * Handle PayPal webhooks
   */
  static handleWebhook = async (req, res, next) => {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      const headers = req.headers;
      const body = req.body;

      // Verify webhook signature if webhook ID is configured
      if (webhookId) {
        const isValid = await PayPalService.verifyWebhookSignature(headers, body, webhookId);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }

      // Process webhook event
      const eventType = body.event_type;
      console.log('📨 PayPal webhook received:', eventType);

      switch (eventType) {
        case 'CHECKOUT.ORDER.APPROVED':
          console.log('✅ PayPal order approved:', body.resource.id);
          break;
        
        case 'PAYMENT.CAPTURE.COMPLETED':
          console.log('✅ PayPal payment captured:', body.resource.id);
          break;
        
        case 'PAYMENT.CAPTURE.DENIED':
          console.log('❌ PayPal payment denied:', body.resource.id);
          break;
        
        case 'PAYMENT.CAPTURE.REFUNDED':
          console.log('🔄 PayPal payment refunded:', body.resource.id);
          break;
        
        default:
          console.log('ℹ️ Unhandled PayPal webhook event:', eventType);
      }

      // Respond to PayPal that webhook was received
      res.status(200).json({ success: true });

    } catch (error) {
      console.error('❌ PayPal webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  };

  /**
   * Get PayPal configuration status
   */
  static getConfigStatus = async (req, res, next) => {
    try {
      const isConfigured = PayPalService.isConfigured();
      
      res.json({
        success: true,
        configured: isConfigured,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      });

    } catch (error) {
      console.error('❌ PayPal config status error:', error);
      next(error);
    }
  };
}

module.exports = PayPalController; 