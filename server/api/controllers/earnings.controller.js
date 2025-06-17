const TransactionLedgerService = require('../services/transaction-ledger.service');
const StripeService = require('../services/stripe.service');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

class EarningsController {
  
  /**
   * Get unified balance from both Stripe and PayPal transactions
   */
  static getUnifiedBalance = async (req, res, next) => {
    try {
      const currentUser = req.currentUser;
      const providerId = currentUser.id.uuid;
      const stripeAccountId = currentUser.attributes.profile.privateData?.stripeAccountId;
      
      console.log('💰 Getting unified balance for provider:', providerId);
      
      // Get Stripe balance (existing functionality)
      let stripeBalance = { pendingAmount: null, availableAmount: null };
      if (stripeAccountId) {
        try {
          const balance = await StripeService.getBalance(stripeAccountId);
          if (balance && balance.available && balance.available.length > 0) {
            stripeBalance = {
              pendingAmount: balance.pending && balance.pending.length > 0 
                ? new Money(balance.pending[0].amount, balance.pending[0].currency) 
                : new Money(0, 'USD'),
              availableAmount: new Money(balance.available[0].amount, balance.available[0].currency)
            };
          }
        } catch (stripeError) {
          console.warn('⚠️ Failed to get Stripe balance:', stripeError.message);
        }
      }
      
      // Get PayPal pending payouts from ledger
      const paypalPendingPayouts = await TransactionLedgerService.calculatePendingPayouts(providerId);
      
      // Calculate unified totals
      const unifiedBalance = {
        // Stripe balances (current Stripe earnings)
        stripeAvailable: stripeBalance.availableAmount || new Money(0, 'USD'),
        stripePending: stripeBalance.pendingAmount || new Money(0, 'USD'),
        
        // PayPal earnings (from ledger)
        paypalPending: paypalPendingPayouts.paypalPending,
        
        // Total unified amounts
        totalAvailable: new Money(
          (stripeBalance.availableAmount?.amount || 0) + (paypalPendingPayouts.paypalPending?.amount || 0),
          'USD'
        ),
        totalPending: new Money(
          (stripeBalance.pendingAmount?.amount || 0),
          'USD'
        ),
        
        // Breakdown by payment method
        breakdown: {
          stripe: {
            available: stripeBalance.availableAmount || new Money(0, 'USD'),
            pending: stripeBalance.pendingAmount || new Money(0, 'USD')
          },
          paypal: {
            pending: paypalPendingPayouts.paypalPending,
            transactionCount: paypalPendingPayouts.transactionCount
          }
        }
      };
      
      console.log('💰 Unified balance calculated:', {
        stripeAvailable: unifiedBalance.stripeAvailable.amount,
        paypalPending: unifiedBalance.paypalPending.amount,
        totalAvailable: unifiedBalance.totalAvailable.amount
      });
      
      res.json({
        success: true,
        balance: unifiedBalance,
        providerId,
        stripeAccountId
      });
      
    } catch (error) {
      console.error('❌ Error getting unified balance:', error);
      next(error);
    }
  };
  
  /**
   * Create unified payout via Stripe Connect for all earnings
   */
  static createUnifiedPayout = async (req, res, next) => {
    try {
      const currentUser = req.currentUser;
      const providerId = currentUser.id.uuid;
      const stripeAccountId = currentUser.attributes.profile.privateData?.stripeAccountId;
      
      if (!stripeAccountId) {
        return res.status(400).json({
          error: 'No Stripe Connect account found. Please set up your payout details first.'
        });
      }
      
      console.log('🔄 Creating unified payout for provider:', providerId);
      
      // Get current balances
      const stripeBalance = await StripeService.getBalance(stripeAccountId);
      const paypalPendingPayouts = await TransactionLedgerService.calculatePendingPayouts(providerId);
      
      // Calculate total available for payout
      const stripeAvailable = stripeBalance?.available?.[0]?.amount || 0;
      const paypalAvailable = paypalPendingPayouts.paypalPending?.amount || 0;
      const totalAvailable = stripeAvailable + paypalAvailable;
      
      if (totalAvailable <= 0) {
        return res.status(400).json({
          error: 'No funds available for payout'
        });
      }
      
      console.log('💰 Unified payout breakdown:', {
        stripeAvailable,
        paypalAvailable,
        totalAvailable
      });
      
      // Create Stripe payout for Stripe earnings (if any)
      let stripePayoutResult = null;
      if (stripeAvailable > 0) {
        try {
          stripePayoutResult = await StripeService.createPayout(
            stripeAccountId,
            stripeAvailable,
            stripeBalance.available[0].currency
          );
          console.log('✅ Stripe payout created:', stripePayoutResult.id);
        } catch (stripeError) {
          console.error('❌ Failed to create Stripe payout:', stripeError);
        }
      }
      
      // Create native payouts for all payment methods
      let nativePayoutResult = null;
      if (paypalAvailable > 0 || stripeAvailable > 0) {
        try {
          nativePayoutResult = await TransactionLedgerService.createNativePayouts(
            req,
            providerId,
            stripeAccountId
          );
          console.log('✅ Native payouts created for all payment methods');
        } catch (payoutError) {
          console.error('❌ Failed to create native payouts:', payoutError);
        }
      }
      
      res.json({
        success: true,
        totalPayout: new Money(totalAvailable, 'USD'),
        payoutMethod: 'native_separate_streams',
        results: nativePayoutResult?.results || [],
        breakdown: nativePayoutResult?.breakdown || {
          stripe: { amount: stripeAvailable },
          paypal: { amount: paypalAvailable }
        },
        stripeAccountId,
        providerId
      });
      
    } catch (error) {
      console.error('❌ Error creating unified payout:', error);
      next(error);
    }
  };
}

module.exports = EarningsController; 