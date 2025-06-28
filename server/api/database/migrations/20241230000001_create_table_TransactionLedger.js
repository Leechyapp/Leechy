/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
        CREATE TABLE IF NOT EXISTS TransactionLedger (
            id int NOT NULL AUTO_INCREMENT,
            paymentMethod varchar(50) NOT NULL,
            transactionId varchar(255) NOT NULL,
            paypalOrderId varchar(255) NULL,
            paypalPaymentId varchar(255) NULL,
            paypalPayoutId varchar(255) NULL COMMENT 'PayPal payout batch ID for native payouts',
            stripePaymentIntentId varchar(255) NULL,
            stripeChargeId varchar(255) NULL,
            stripePayoutId varchar(255) NULL COMMENT 'Stripe payout ID for Connect payouts',
            providerId varchar(255) NOT NULL,
            customerId varchar(255) NOT NULL,
            payinTotal JSON NOT NULL COMMENT 'Amount customer paid including fees',
            payoutTotal JSON NOT NULL COMMENT 'Amount seller earns after platform fee',
            platformFee JSON NOT NULL COMMENT 'Platform commission amount',
            currency varchar(3) NOT NULL,
            status varchar(50) NOT NULL DEFAULT 'completed',
            payoutStatus varchar(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, paid, failed',
            lineItems JSON NULL COMMENT 'Original transaction line items',
            paypalData JSON NULL COMMENT 'PayPal specific transaction data',
            stripeData JSON NULL COMMENT 'Stripe specific transaction data',
            created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_provider_payout (providerId, payoutStatus),
            INDEX idx_payment_method (paymentMethod),
            INDEX idx_transaction (transactionId),
            INDEX idx_paypal_order (paypalOrderId),
            INDEX idx_stripe_payment (stripePaymentIntentId),
            PRIMARY KEY (id)
        )
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('TransactionLedger');
}; 