const PayPalService = require('./paypal.service');
const SharetribeService = require('./sharetribe.service');

class PayPalTransactionHandlerService {
  
  /**
   * Handle PayPal authorization void when booking is declined
   * This should be called after a decline transition occurs
   */
  static async handleBookingDecline(transactionId, req = null) {
    try {
      console.log('🔄 Checking if PayPal authorization needs to be voided for declined booking:', transactionId);
      
      // Get transaction details to check payment method
      const transactionRes = await SharetribeService.showTransaction(req, null, transactionId);
      const transaction = transactionRes.data;
      const { protectedData } = transaction.attributes;
      
      const { 
        paymentType,
        paypalOrderId,
        paypalAuthorizationId,
        paypalCaptured 
      } = protectedData;
      
      // Only handle PayPal transactions
      if (paymentType !== 'paypal') {
        console.log('ℹ️ Not a PayPal transaction - skipping authorization void');
        return { success: true, skipped: true, reason: 'Not PayPal payment' };
      }
      
      // Check if already captured (if captured, we'd need refund instead of void)
      if (paypalCaptured) {
        console.log('⚠️ PayPal payment already captured - cannot void, would need refund');
        return { success: false, error: 'Payment already captured - refund required instead' };
      }
      
      // Check if we have authorization ID
      if (!paypalAuthorizationId) {
        console.log('⚠️ No PayPal authorization ID found - cannot void');
        return { success: false, error: 'No authorization ID found' };
      }
      
      console.log('🔄 Voiding PayPal authorization:', paypalAuthorizationId);
      
      // Void the PayPal authorization
      const voidResult = await PayPalService.voidAuthorization(paypalAuthorizationId);
      
      console.log('✅ PayPal authorization voided successfully:', voidResult);
      
      return {
        success: true,
        voided: true,
        authorizationId: paypalAuthorizationId,
        voidResult: voidResult
      };
      
    } catch (error) {
      console.error('❌ Failed to void PayPal authorization on decline:', error);
      
      // Don't fail the decline process - just log the error
      return {
        success: false,
        error: error.message,
        authorizationId: paypalAuthorizationId || 'unknown'
      };
    }
  }
  
  /**
   * Handle PayPal authorization void when booking expires
   * Similar to decline but for expiration
   */
  static async handleBookingExpire(transactionId, req = null) {
    console.log('🔄 Handling PayPal authorization void for expired booking:', transactionId);
    return this.handleBookingDecline(transactionId, req);
  }
  
  /**
   * Check if a transaction has PayPal authorization that can be voided
   */
  static async canVoidPayPalAuthorization(transactionId, req = null) {
    try {
      const transactionRes = await SharetribeService.showTransaction(req, null, transactionId);
      const transaction = transactionRes.data;
      const { protectedData } = transaction.attributes;
      
      const { 
        paymentType,
        paypalAuthorizationId,
        paypalCaptured 
      } = protectedData;
      
      return {
        canVoid: paymentType === 'paypal' && paypalAuthorizationId && !paypalCaptured,
        paymentType,
        hasAuthorizationId: !!paypalAuthorizationId,
        alreadyCaptured: !!paypalCaptured
      };
      
    } catch (error) {
      console.error('❌ Failed to check PayPal void eligibility:', error);
      return {
        canVoid: false,
        error: error.message
      };
    }
  }
}

module.exports = PayPalTransactionHandlerService; 