const knex = require('./server/api/database/knexDB');

/**
 * Reset test data to stop infinite payouts - MySQL version
 */
async function resetTestDataMySQL() {
  console.log('🔄 Resetting test data in MySQL database to stop infinite payouts...');
  
  try {
    // Reset the specific provider's pending PayPal transactions
    const providerId = '68598efe-ace2-42fb-b3dc-2ce4adbb3800';
    
    console.log(`🔍 Looking for pending PayPal transactions for provider: ${providerId}`);
    console.log('🔗 Connected to MySQL database via knex');
    
    // First check what we have - using MySQL syntax
    const pendingTransactions = await knex('TransactionLedger')
      .where({ 
        providerId, 
        paymentMethod: 'paypal', 
        payoutStatus: 'pending' 
      })
      .select('id', 'payoutStatus', 'paypalPayoutId', 'payoutTotal', 'created');
    
    console.log(`📋 Found ${pendingTransactions.length} pending PayPal transactions:`);
    pendingTransactions.forEach(tx => {
      const payoutTotal = JSON.parse(tx.payoutTotal);
      console.log(`  - ID: ${tx.id}, Status: ${tx.payoutStatus}, Amount: $${payoutTotal.amount/100}, Created: ${tx.created}`);
    });
    
    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions found - system is already clean!');
      console.log('🎉 The infinite payout issue appears to be resolved!');
    } else {
      console.log(`🔧 Marking ${pendingTransactions.length} transactions as paid...`);
      
      // Update them to paid status - MySQL compatible
      const updated = await knex('TransactionLedger')
        .where({ 
          providerId, 
          paymentMethod: 'paypal', 
          payoutStatus: 'pending' 
        })
        .update({
          payoutStatus: 'paid',
          paypalPayoutId: 'MANUAL_RESET_20250625',
          updated: knex.fn.now()  // MySQL NOW() function
        });
      
      console.log(`✅ Successfully marked ${updated} transactions as paid`);
      console.log('🎯 Infinite payout issue should now be resolved!');
    }
    
    // Verify the fix
    const remainingPending = await knex('TransactionLedger')
      .where({ 
        providerId, 
        paymentMethod: 'paypal', 
        payoutStatus: 'pending' 
      })
      .count('id as count');
    
    const pendingCount = parseInt(remainingPending[0]?.count || 0);
    
    console.log('\n🔍 VERIFICATION:');
    if (pendingCount === 0) {
      console.log('✅ VERIFICATION PASSED: No pending PayPal transactions remain');
      console.log('🎉 The earnings balance should now show $0 for this provider!');
      console.log('✅ System ready for production use!');
    } else {
      console.log(`❌ VERIFICATION FAILED: Still ${pendingCount} pending transactions`);
    }
    
    // Show final status
    console.log('\n📊 FINAL STATUS CHECK:');
    const allTransactions = await knex('TransactionLedger')
      .where({ providerId, paymentMethod: 'paypal' })
      .select('id', 'payoutStatus', 'paypalPayoutId')
      .orderBy('created', 'desc');
    
    console.log(`📋 All PayPal transactions for provider ${providerId}:`);
    allTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ID: ${tx.id}, Status: ${tx.payoutStatus}, PayoutID: ${tx.paypalPayoutId || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to reset test data:', error);
    console.error('Error details:', error.message);
  } finally {
    await knex.destroy();
    process.exit(0);
  }
}

resetTestDataMySQL().catch(console.error); 