const knex = require('./server/api/database/knexDB');

/**
 * Simple script to add missing columns to production database
 */
async function runMigration() {
  console.log('🔧 Adding missing columns to TransactionLedger table...');
  
  try {
    // Add paypalPayoutId column if it doesn't exist
    try {
      await knex.raw(`ALTER TABLE TransactionLedger ADD COLUMN paypalPayoutId varchar(255) NULL`);
      console.log('✅ Added paypalPayoutId column');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate column')) {
        console.log('✅ paypalPayoutId column already exists');
      } else {
        console.error('❌ Failed to add paypalPayoutId:', error.message);
      }
    }
    
    // Add stripePayoutId column if it doesn't exist
    try {
      await knex.raw(`ALTER TABLE TransactionLedger ADD COLUMN stripePayoutId varchar(255) NULL`);
      console.log('✅ Added stripePayoutId column');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate column')) {
        console.log('✅ stripePayoutId column already exists');
      } else {
        console.error('❌ Failed to add stripePayoutId:', error.message);
      }
    }
    
    console.log('🎯 Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await knex.destroy();
    process.exit(0);
  }
}

runMigration().catch(console.error); 