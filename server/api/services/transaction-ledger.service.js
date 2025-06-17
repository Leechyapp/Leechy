const TransactionUtil = require('../utils/transaction.util');
const knexDB = require('../database/knexDB');
const { types } = require('sharetribe-flex-sdk');
const { Money, UUID } = types;

class TransactionLedgerService {
  
  /**
   * Record a PayPal transaction and calculate payout amounts
   * @param {Object} paypalOrderData - PayPal order capture data
   * @param {Object} transactionLineItems - Original transaction line items
   * @param {String} providerId - Seller's user ID
   * @param {String} customerId - Buyer's user ID
   * @returns {Object} Ledger entry with payout calculations
   */
  static async recordPayPalTransaction(paypalOrderData, transactionLineItems, providerId, customerId) {
    console.log('🔧 TransactionLedgerService.recordPayPalTransaction called with:');
    console.log('🔧 - paypalOrderData:', JSON.stringify(paypalOrderData, null, 2));
    console.log('🔧 - transactionLineItems:', JSON.stringify(transactionLineItems, null, 2));
    console.log('🔧 - providerId:', providerId);
    console.log('🔧 - customerId:', customerId);
    
    // Extract amount and currency from the paymentInfo object (not from order.purchase_units)
    const amount = paypalOrderData.amount;
    const currency = paypalOrderData.currency || 'USD';
    
    console.log('🔧 Extracted amount:', amount);
    console.log('🔧 Extracted currency:', currency);
    
    // Calculate payouts using existing line item logic
    console.log('🔧 About to calculate payouts...');
    const payinTotal = TransactionUtil.calculatePayinTotal(transactionLineItems);
    console.log('🔧 PayinTotal calculated:', payinTotal);
    
    const payoutTotal = TransactionUtil.calculatePayoutTotal(transactionLineItems);
    console.log('🔧 PayoutTotal calculated:', payoutTotal);
    
    const platformFee = payinTotal.amount - payoutTotal.amount;
    console.log('🔧 Platform fee calculated:', platformFee);
    
    console.log('💰 PayPal Transaction Ledger Entry:');
    console.log('💰 PayIn Total (Customer Paid):', payinTotal);
    console.log('💰 PayOut Total (Seller Earns):', payoutTotal);
    console.log('💰 Platform Fee:', platformFee);
    
    const ledgerEntry = {
      paymentMethod: 'paypal',
      paypalOrderId: paypalOrderData.orderId,
      paypalPaymentId: paypalOrderData.paymentId,
      providerId,
      customerId,
      payinTotal,
      payoutTotal,
      platformFee: new Money(platformFee, currency),
      currency,
      status: 'completed',
      createdAt: new Date(),
      lineItems: transactionLineItems,
      
      // PayPal specific data
      paypalData: {
        orderId: paypalOrderData.orderId,
        paymentId: paypalOrderData.paymentId,
        payer: paypalOrderData.order.payer,
        captureTime: paypalOrderData.order.update_time,
      }
    };
    
    // Store in database
    try {
      const dbEntry = {
        paymentMethod: 'paypal',
        transactionId: `paypal_${paypalOrderData.orderId}`,
        paypalOrderId: paypalOrderData.orderId,
        paypalPaymentId: paypalOrderData.paymentId,
        providerId,
        customerId,
        payinTotal: JSON.stringify(payinTotal),
        payoutTotal: JSON.stringify(payoutTotal),
        platformFee: JSON.stringify(new Money(platformFee, currency)),
        currency,
        status: 'completed',
        payoutStatus: 'pending',
        lineItems: JSON.stringify(transactionLineItems),
        paypalData: JSON.stringify(ledgerEntry.paypalData)
      };
      
      const [insertId] = await knexDB('TransactionLedger').insert(dbEntry);
      ledgerEntry.id = insertId;
      
      console.log('✅ PayPal transaction stored in database with ID:', insertId);
    } catch (dbError) {
      console.error('❌ Failed to store PayPal transaction in database:', dbError);
      // Don't throw error here - payment succeeded, just logging failed
    }
    
    return ledgerEntry;
  }
  
  /**
   * Record a Stripe transaction for comparison/unified tracking
   * @param {Object} stripePaymentIntent - Stripe payment intent data
   * @param {Object} transactionLineItems - Original transaction line items
   * @param {String} providerId - Seller's user ID
   * @param {String} customerId - Buyer's user ID
   * @returns {Object} Ledger entry
   */
  static async recordStripeTransaction(stripePaymentIntent, transactionLineItems, providerId, customerId) {
    const payinTotal = TransactionUtil.calculatePayinTotal(transactionLineItems);
    const payoutTotal = TransactionUtil.calculatePayoutTotal(transactionLineItems);
    const platformFee = payinTotal.amount - payoutTotal.amount;
    
    const ledgerEntry = {
      paymentMethod: 'stripe',
      stripePaymentIntentId: stripePaymentIntent.id,
      stripeChargeId: stripePaymentIntent.latest_charge,
      providerId,
      customerId,
      payinTotal,
      payoutTotal,
      platformFee: new Money(platformFee, payinTotal.currency),
      currency: payinTotal.currency,
      status: 'completed',
      createdAt: new Date(),
      lineItems: transactionLineItems,
      
      // Stripe specific data
      stripeData: {
        paymentIntentId: stripePaymentIntent.id,
        chargeId: stripePaymentIntent.latest_charge,
        transferData: stripePaymentIntent.transfer_data,
      }
    };
    
    // Store in database
    try {
      const dbEntry = {
        paymentMethod: 'stripe',
        transactionId: `stripe_${stripePaymentIntent.id}`,
        stripePaymentIntentId: stripePaymentIntent.id,
        stripeChargeId: stripePaymentIntent.latest_charge,
        providerId,
        customerId,
        payinTotal: JSON.stringify(payinTotal),
        payoutTotal: JSON.stringify(payoutTotal),
        platformFee: JSON.stringify(new Money(platformFee, payinTotal.currency)),
        currency: payinTotal.currency,
        status: 'completed',
        payoutStatus: 'pending',
        lineItems: JSON.stringify(transactionLineItems),
        stripeData: JSON.stringify(ledgerEntry.stripeData)
      };
      
      const [insertId] = await knexDB('TransactionLedger').insert(dbEntry);
      ledgerEntry.id = insertId;
      
      console.log('✅ Stripe transaction stored in database with ID:', insertId);
    } catch (dbError) {
      console.error('❌ Failed to store Stripe transaction in database:', dbError);
      // Don't throw error here - payment succeeded, just logging failed
    }
    
    return ledgerEntry;
  }
  
  /**
   * Calculate pending payouts for a provider across all payment methods
   * @param {String} providerId - Seller's user ID
   * @returns {Object} Pending payout amounts
   */
  static async calculatePendingPayouts(providerId) {
    try {
      // Query database for unpaid ledger entries
      const pendingEntries = await knexDB('TransactionLedger')
        .where({ providerId, payoutStatus: 'pending' })
        .select('*');
      
      let totalPending = 0;
      let paypalPending = 0;
      let stripePending = 0;
      let currency = 'USD';
      
      pendingEntries.forEach(entry => {
        const payoutTotal = JSON.parse(entry.payoutTotal);
        currency = payoutTotal.currency || currency;
        
        totalPending += payoutTotal.amount || 0;
        
        if (entry.paymentMethod === 'paypal') {
          paypalPending += payoutTotal.amount || 0;
        } else if (entry.paymentMethod === 'stripe') {
          stripePending += payoutTotal.amount || 0;
        }
      });
      
      return {
        totalPending: new Money(totalPending, currency),
        paypalPending: new Money(paypalPending, currency),
        stripePending: new Money(stripePending, currency),
        transactionCount: pendingEntries.length,
        entries: pendingEntries,
      };
    } catch (error) {
      console.error('❌ Error calculating pending payouts:', error);
      return {
        totalPending: new Money(0, 'USD'),
        paypalPending: new Money(0, 'USD'),
        stripePending: new Money(0, 'USD'),
        transactionCount: 0,
        entries: [],
      };
    }
  }
  
  /**
   * Create separate payouts for each payment method through their native systems
   * This eliminates the need to pre-fund Stripe accounts with PayPal money
   * 
   * @param {Object} req - Express request object for authentication
   * @param {String} providerId - Seller's user ID
   * @param {String} stripeAccountId - Seller's Stripe Connect account
   * @returns {Object} Payout result
   */
  static async createNativePayouts(req, providerId, stripeAccountId) {
    const StripeService = require('./stripe.service');
    const PayPalService = require('./paypal.service');
    
    const pendingPayouts = await this.calculatePendingPayouts(providerId);
    
    if (pendingPayouts.totalPending.amount <= 0) {
      throw new Error('No pending payouts available');
    }
    
    console.log('🔄 Creating native payouts:');
    console.log('🔄 Provider ID:', providerId);
    console.log('🔄 Total Pending:', pendingPayouts.totalPending);
    console.log('🔄 PayPal Earnings:', pendingPayouts.paypalPending);
    console.log('🔄 Stripe Earnings:', pendingPayouts.stripePending);
    
    const payoutResults = [];
    
    // Handle Stripe earnings through Stripe Connect (existing flow)
    if (pendingPayouts.stripePending.amount > 0) {
      try {
        console.log('💳 Processing Stripe earnings through Stripe Connect...');
        
        // Validate no recent Stripe payouts to prevent double-spending
        await this.validateNoPendingPayouts(providerId, 'stripe');
        
        // Get actual Stripe balance for this seller
        const stripeBalance = await StripeService.getBalance(stripeAccountId);
        const availableStripe = stripeBalance?.available?.[0]?.amount || 0;
        
        if (availableStripe > 0) {
          const stripePayoutResult = await StripeService.createPayout(
            stripeAccountId,
            availableStripe,
            stripeBalance.available[0].currency
          );
          
          // Mark Stripe transactions as paid with robust error handling
          const payoutMarked = await this.markTransactionsPaid(
            providerId, 
            'stripe', 
            stripePayoutResult.id,
            pendingPayouts.stripePending
          );
          
          if (!payoutMarked) {
            console.warn('⚠️ Database update failed but Stripe payout was successful');
          }
          
          payoutResults.push({
            method: 'stripe',
            amount: availableStripe,
            currency: stripeBalance.available[0].currency,
            payoutId: stripePayoutResult.id,
            status: 'completed'
          });
          
          console.log('✅ Stripe payout completed:', stripePayoutResult.id);
        }
      } catch (stripeError) {
        console.error('❌ Stripe payout failed:', stripeError);
        payoutResults.push({
          method: 'stripe',
          status: 'failed',
          error: stripeError.message
        });
      }
    }
    
    // Handle PayPal earnings through PayPal Payouts API (new native flow)
    if (pendingPayouts.paypalPending.amount > 0) {
      try {
        console.log('💰 Processing PayPal earnings through PayPal native payouts...');
        
        // Validate no recent PayPal payouts to prevent double-spending
        await this.validateNoPendingPayouts(providerId, 'paypal');
        
        // Get seller's PayPal email from user profile
        const paypalEmail = await this.getPayPalEmailFromUserProfile(req, providerId);
        
        if (!paypalEmail) {
          throw new Error('Seller must add PayPal email to their profile (Account Settings → Contact Details) to receive PayPal earnings');
        }
        
        // Create PayPal payout using PayPal Payouts API
        const paypalPayoutResult = await PayPalService.createPayout({
          recipientEmail: paypalEmail,
          amount: pendingPayouts.paypalPending.amount,
          currency: pendingPayouts.paypalPending.currency,
          note: `Leechy marketplace earnings - Provider ${providerId}`
        });
        
                          // Mark PayPal transactions as paid with robust error handling
        const payoutMarked = await this.markTransactionsPaid(
          providerId, 
          'paypal', 
          paypalPayoutResult.payout_batch_id,
          pendingPayouts.paypalPending
        );
        
        if (!payoutMarked) {
          console.warn('⚠️ Database update failed but PayPal payout was successful');
        }
        
        payoutResults.push({
          method: 'paypal',
          amount: pendingPayouts.paypalPending.amount,
          currency: pendingPayouts.paypalPending.currency,
          payoutId: paypalPayoutResult.payout_batch_id,
          status: 'completed'
        });
        
        console.log('✅ PayPal payout completed:', paypalPayoutResult.payout_batch_id);
        
      } catch (paypalError) {
        console.error('❌ PayPal payout failed:', paypalError);
        payoutResults.push({
          method: 'paypal',
          status: 'failed',
          error: paypalError.message
        });
      }
    }
    
    return {
      success: true,
      totalAmount: pendingPayouts.totalPending,
      providerId,
      payoutMethod: 'native_separate_streams',
      timestamp: new Date(),
      results: payoutResults,
      breakdown: {
        paypal: pendingPayouts.paypalPending,
        stripe: pendingPayouts.stripePending
      }
    };
  }

  /**
   * Robustly mark transactions as paid with database schema validation
   * @param {String} providerId - Seller's user ID
   * @param {String} paymentMethod - 'paypal' or 'stripe'
   * @param {String} payoutId - External payout ID from payment provider
   * @param {Object} amount - Money object with amount info
   * @returns {Boolean} Success status
   */
  static async markTransactionsPaid(providerId, paymentMethod, payoutId, amount) {
    try {
      console.log(`🔧 Marking ${paymentMethod} transactions as paid for provider ${providerId}`);
      
      // First check if the required columns exist (handles migration issues)
      const payoutIdColumn = paymentMethod === 'paypal' ? 'paypalPayoutId' : 'stripePayoutId';
      
      try {
        // Try to check if column exists - this is database-specific
        const testQuery = await knexDB('TransactionLedger')
          .select(payoutIdColumn)
          .limit(1);
        console.log(`✅ Column ${payoutIdColumn} exists and accessible`);
      } catch (columnError) {
        if (columnError.message.includes('Unknown column') || columnError.message.includes('does not exist')) {
          console.warn(`⚠️ Column ${payoutIdColumn} doesn't exist, creating it...`);
          
          try {
            // Try to add the missing column
            await knexDB.raw(`ALTER TABLE TransactionLedger ADD COLUMN ${payoutIdColumn} varchar(255) NULL`);
            console.log(`✅ Successfully added column ${payoutIdColumn}`);
          } catch (alterError) {
            console.error(`❌ Failed to add column ${payoutIdColumn}:`, alterError.message);
            throw new Error(`Database schema issue: ${payoutIdColumn} column missing and cannot be added`);
          }
        } else {
          throw columnError;
        }
      }
      
      // Prepare update data
      const updateData = {
        payoutStatus: 'paid',
        updated: new Date()
      };
      updateData[payoutIdColumn] = payoutId;
      
      // Update the transactions
      const updatedRows = await knexDB('TransactionLedger')
        .where({ 
          providerId, 
          paymentMethod, 
          payoutStatus: 'pending' 
        })
        .update(updateData);
      
      console.log(`✅ Successfully marked ${updatedRows} ${paymentMethod} transactions as paid`);
      console.log(`✅ Payout ID ${payoutId} recorded for tracking`);
      
      if (updatedRows === 0) {
        console.warn(`⚠️ No pending ${paymentMethod} transactions found to update`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to mark ${paymentMethod} transactions as paid:`, error.message);
      
      // Fallback logging for manual tracking
      console.log(`📋 MANUAL PAYOUT TRACKING REQUIRED:`);
      console.log(`   Provider ID: ${providerId}`);
      console.log(`   Payment Method: ${paymentMethod}`);
      console.log(`   Payout ID: ${payoutId}`);
      console.log(`   Amount: ${amount?.amount || 'unknown'} ${amount?.currency || 'USD'}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      console.log(`   Error: ${error.message}`);
      
      return false;
    }
  }

  /**
   * Validate that no recent payouts have been processed to prevent double-spending
   * @param {String} providerId - Seller's user ID
   * @param {String} paymentMethod - 'paypal' or 'stripe'
   * @returns {Boolean} True if safe to proceed
   */
  static async validateNoPendingPayouts(providerId, paymentMethod) {
    try {
      console.log(`🔍 Validating no recent ${paymentMethod} payouts for provider ${providerId}`);
      
      const payoutIdColumn = paymentMethod === 'paypal' ? 'paypalPayoutId' : 'stripePayoutId';
      
      try {
        // Check for recent successful payouts (within last 5 minutes)
        const recentPayouts = await knexDB('TransactionLedger')
          .where({ providerId, paymentMethod })
          .where('updated', '>', new Date(Date.now() - 5 * 60 * 1000))
          .whereNotNull(payoutIdColumn)
          .count('id as count');
        
        const recentCount = parseInt(recentPayouts[0]?.count || 0);
        
        if (recentCount > 0) {
          console.warn(`⚠️ Found ${recentCount} recent ${paymentMethod} payouts - preventing duplicate`);
          throw new Error(`Recent ${paymentMethod} payout already processed. Please wait 5 minutes before trying again.`);
        }
        
        console.log(`✅ No recent ${paymentMethod} payouts found - safe to proceed`);
        return true;
        
      } catch (columnError) {
        if (columnError.message.includes('Unknown column') || columnError.message.includes('does not exist')) {
          console.warn(`⚠️ Column ${payoutIdColumn} doesn't exist - skipping validation (database needs migration)`);
          console.log(`✅ Proceeding with payout (first time setup)`);
          return true;
        } else {
          throw columnError;
        }
      }
      
    } catch (error) {
      console.error(`❌ Payout validation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get seller's PayPal email from their user profile via Sharetribe SDK
   * This gets the email they've saved for receiving payouts, not the payer's email
   * @param {Object} req - Express request object with current user context
   * @param {String} providerId - Seller's user ID
   * @returns {String} PayPal email address
   */
  static async getPayPalEmailFromUserProfile(req, providerId) {
    try {
      console.log('🔍 Looking up seller\'s saved PayPal email for provider:', providerId);
      
      // Check if the current user is the provider (most common case in payouts)
      const currentUser = req.currentUser;
      if (currentUser && currentUser.id.uuid === providerId) {
        const protectedData = currentUser.attributes.profile.protectedData || {};
        const sellerPayPalEmail = protectedData.paypalEmail;
        
        if (!sellerPayPalEmail) {
          console.log('❌ No PayPal email saved in seller profile for provider:', providerId);
          console.log('💡 Seller needs to add PayPal email in Account Settings → Contact Details');
          return null;
        }
        
        console.log('✅ Seller\'s saved PayPal email found:', {
          providerId,
          hasPayPalEmail: !!sellerPayPalEmail,
          paypalEmail: sellerPayPalEmail ? `${sellerPayPalEmail.substring(0, 3)}***${sellerPayPalEmail.substring(sellerPayPalEmail.length - 4)}` : 'None'
        });
        
        return sellerPayPalEmail;
      }
      
      // If we need to look up a different user, use the SDK
      // This is less common but might happen in admin scenarios
      const SharetribeService = require('./sharetribe.service');
      const { getSdk } = require('../../api-util/sdk');
      
      try {
        const sdk = getSdk(req);
        const userResponse = await sdk.users.show({
          id: providerId,
          include: [],
        });
        
        const user = userResponse.data.data;
        if (!user) {
          console.log('❌ No user found for provider:', providerId);
          return null;
        }
        
        const protectedData = user.attributes.profile.protectedData || {};
        const sellerPayPalEmail = protectedData.paypalEmail;
        
        if (!sellerPayPalEmail) {
          console.log('❌ No PayPal email saved in seller profile for provider:', providerId);
          console.log('💡 Seller needs to add PayPal email in Account Settings → Contact Details');
          return null;
        }
        
        console.log('✅ Seller\'s saved PayPal email found via SDK:', {
          providerId,
          hasPayPalEmail: !!sellerPayPalEmail,
          paypalEmail: sellerPayPalEmail ? `${sellerPayPalEmail.substring(0, 3)}***${sellerPayPalEmail.substring(sellerPayPalEmail.length - 4)}` : 'None'
        });
        
        return sellerPayPalEmail;
        
      } catch (sdkError) {
        console.error('❌ Failed to fetch user via SDK:', sdkError);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to get seller\'s PayPal email from profile:', error);
      return null;
    }
  }
}

module.exports = TransactionLedgerService; 