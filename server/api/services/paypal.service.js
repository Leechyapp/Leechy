const axios = require('axios');

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log('PayPal Environment:', isProduction ? 'PRODUCTION' : 'SANDBOX');
    
    if (isProduction) {
      console.log('WARNING: PayPal is in PRODUCTION mode - REAL MONEY will be charged!');
    }
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ PayPal credentials not configured. PayPal/Venmo payments will not work.');
    }
  }

  /**
   * Get PayPal access token for API calls
   */
  async getAccessToken() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get PayPal access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  /**
   * Create a PayPal order
   */
  async createOrder(orderData) {
    const accessToken = await this.getAccessToken();
    
    const { amount, currency = 'USD', description = 'Leechy Booking Payment', metadata = {} } = orderData;

    // Convert amount to proper format (PayPal expects string with 2 decimal places)
    // Frontend sends amount in dollars (e.g., 0.01 for 1 cent)
    const formattedAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^0-9.-]+/g, '')).toFixed(2)
      : parseFloat(amount).toFixed(2); // Amount is already in dollars

    const order = {
      intent: 'AUTHORIZE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: formattedAmount
        },
        description: description,
        custom_id: metadata.transactionId || metadata.bookingId || undefined,
        invoice_id: metadata.invoiceId || undefined
      }],
      application_context: {
        brand_name: 'Leechy',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: metadata.returnUrl,
        cancel_url: metadata.cancelUrl
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        order,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal order created:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Failed to create PayPal order:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('PayPal API error details:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error('Failed to create PayPal order');
    }
  }

  /**
   * Capture a PayPal order (DEPRECATED - use authorizeOrder + captureAuthorization for proper flow)
   */
  async captureOrder(orderId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal order captured:', orderId);
      return response.data;
    } catch (error) {
      console.error('Failed to capture PayPal order:', error.response?.data || error.message);
      throw new Error('Failed to capture PayPal order');
    }
  }

  /**
   * Authorize a PayPal order (new proper flow for bookings)
   * This authorizes the payment but doesn't capture it until seller accepts
   */
  async authorizeOrder(orderId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/authorize`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal order authorized (not captured):', orderId);
      return response.data;
    } catch (error) {
      console.error('Failed to authorize PayPal order:', error.response?.data || error.message);
      throw new Error('Failed to authorize PayPal order');
    }
  }

  /**
   * Capture an authorized PayPal payment
   * This is called when the seller accepts the booking
   */
  async captureAuthorization(authorizationId, amount = null) {
    const accessToken = await this.getAccessToken();

    const captureData = {};
    if (amount) {
      captureData.amount = {
        currency_code: amount.currency.toUpperCase(),
        value: typeof amount.value === 'string' 
          ? parseFloat(amount.value.replace(/[^0-9.-]+/g, '')).toFixed(2)
          : parseFloat(amount.value).toFixed(2)
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/authorizations/${authorizationId}/capture`,
        captureData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal authorization captured:', authorizationId);
      return response.data;
    } catch (error) {
      console.error('Failed to capture PayPal authorization:', error.response?.data || error.message);
      throw new Error('Failed to capture PayPal authorization');
    }
  }

  /**
   * Void an authorized PayPal payment
   * This is called when the seller declines the booking
   */
  async voidAuthorization(authorizationId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/authorizations/${authorizationId}/void`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal authorization voided:', authorizationId);
      return response.data;
    } catch (error) {
      console.error('Failed to void PayPal authorization:', error.response?.data || error.message);
      throw new Error('Failed to void PayPal authorization');
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get PayPal order:', error.response?.data || error.message);
      throw new Error('Failed to retrieve PayPal order');
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(captureId, refundData) {
    const accessToken = await this.getAccessToken();
    
    const { amount, currency = 'USD', reason = 'Refund requested' } = refundData;

    const refund = {
      amount: {
        currency_code: currency.toUpperCase(),
        value: typeof amount === 'string' 
          ? parseFloat(amount.replace(/[^0-9.-]+/g, '')).toFixed(2)
          : (amount / 100).toFixed(2)
      },
      note_to_payer: reason
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payments/captures/${captureId}/refund`,
        refund,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );

      console.log('PayPal refund processed:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Failed to process PayPal refund:', error.response?.data || error.message);
      throw new Error('Failed to process PayPal refund');
    }
  }

  /**
   * Verify webhook signature (for webhook security)
   */
  async verifyWebhookSignature(headers, body, webhookId) {
    const accessToken = await this.getAccessToken();

    const verificationData = {
      auth_algo: headers['paypal-auth-algo'],
      cert_id: headers['paypal-cert-id'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/notifications/verify-webhook-signature`,
        verificationData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('Failed to verify PayPal webhook:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Generate unique request ID for idempotency
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate PayPal configuration
   */
  isConfigured() {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Create a PayPal payout to send money directly to a seller's PayPal account
   * This eliminates the need to route PayPal earnings through Stripe
   * @param {Object} payoutData - Payout details
   * @param {String} payoutData.recipientEmail - Seller's PayPal email
   * @param {Number} payoutData.amount - Amount in cents
   * @param {String} payoutData.currency - Currency code
   * @param {String} payoutData.note - Payout description
   * @returns {Object} PayPal payout response
   */
  async createPayout(payoutData) {
    const { recipientEmail, amount, currency, note } = payoutData;
    
    try {
      const accessToken = await this.getAccessToken();
      
      // Convert amount from cents to dollars for PayPal API
      const amountInDollars = (amount / 100).toFixed(2);
      
      const payoutPayload = {
        sender_batch_header: {
          sender_batch_id: `leechy_payout_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          email_subject: "You have received a payment from Leechy",
          email_message: "You have received a payout from Leechy marketplace for your sales."
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: amountInDollars,
              currency: currency.toUpperCase()
            },
            receiver: recipientEmail,
            note: note || `Leechy marketplace payout`,
            sender_item_id: `item_${Date.now()}`
          }
        ]
      };
      
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/payouts`,
        payoutPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': this.generateRequestId(),
          },
        }
      );
      
      console.log('PayPal payout created successfully:', {
        batchId: response.data.batch_header?.payout_batch_id,
        status: response.data.batch_header?.batch_status
      });
      
      return {
        success: true,
        payout_batch_id: response.data.batch_header?.payout_batch_id,
        batch_status: response.data.batch_header?.batch_status,
        amount: amountInDollars,
        currency: currency,
        recipient: recipientEmail,
        raw_response: response.data
      };
      
    } catch (error) {
      console.error('PayPal payout error:', error.response?.data || error.message);
      throw new Error(`Failed to create PayPal payout: ${error.message}`);
    }
  }

  /**
   * Check the status of a PayPal payout batch
   * @param {String} payoutBatchId - The payout batch ID
   * @returns {Object} Payout status
   */
  async getPayoutStatus(payoutBatchId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/v1/payments/payouts/${payoutBatchId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      return {
        batch_id: response.data.batch_header?.payout_batch_id,
        status: response.data.batch_header?.batch_status,
        total_amount: response.data.batch_header?.amount,
        items: response.data.items || []
      };
      
    } catch (error) {
      console.error('PayPal payout status check failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new PayPalService();