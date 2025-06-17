const knex = require('./server/api/database/knexDB');

/**
 * Reset test data to stop infinite payouts
 */
async function resetTestData() {
  console.log('🔄 Resetting test data to stop infinite payouts...');
  
  try {
    // Reset the specific provider's pending PayPal transactions
    const providerId = '68598efe-ace2-42fb-b3dc-2ce4adbb3800';
    
    console.log(`🔍 Looking for pending PayPal transactions for provider: ${providerId}`);
    
    // First check what we have
    const pendingTransactions = await knex('TransactionLedger')
      .where({ 
        providerId, 
        paymentMethod: 'paypal', 
        payoutStatus: 'pending' 
      })
      .select('id', 'payoutStatus', 'paypalPayoutId', 'payoutTotal');
    
    console.log(`📋 Found ${pendingTransactions.length} pending PayPal transactions:`);
    pendingTransactions.forEach(tx => {
      console.log(`  - ID: ${tx.id}, Status: ${tx.payoutStatus}, PayoutID: ${tx.paypalPayoutId || 'NULL'}`);
    });
    
    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions found - system is already clean!');
    } else {
      // Update them to paid status
      const updated = await knex('TransactionLedger')
        .where({ 
          providerId, 
          paymentMethod: 'paypal', 
          payoutStatus: 'pending' 
        })
        .update({
          payoutStatus: 'paid',
          paypalPayoutId: 'RESET_20250625',
          updated: new Date()
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
    
    if (pendingCount === 0) {
      console.log('✅ VERIFICATION PASSED: No pending PayPal transactions remain');
      console.log('🎉 The earnings balance should now show $0 for this provider!');
    } else {
      console.log(`❌ VERIFICATION FAILED: Still ${pendingCount} pending transactions`);
    }
    
  } catch (error) {
    console.error('❌ Failed to reset test data:', error);
  } finally {
    await knex.destroy();
    process.exit(0);
  }
}

resetTestData().catch(console.error); 