const fs = require('fs');
const path = require('path');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' && 
                    !process.env.HEROKU_APP_NAME?.includes('staging');
const isStaging = process.env.HEROKU_APP_NAME?.includes('staging') || 
                  process.env.NODE_ENV !== 'production';

// File paths
const wellKnownDir = path.join(__dirname, '../public/.well-known');
const productionFile = path.join(wellKnownDir, 'apple-pay-production.txt');
const stagingFile = path.join(wellKnownDir, 'apple-pay-staging.txt');
const targetFile = path.join(wellKnownDir, 'apple-developer-merchantid-domain-association.txt');

// Ensure .well-known directory exists
if (!fs.existsSync(wellKnownDir)) {
  fs.mkdirSync(wellKnownDir, { recursive: true });
}

// Copy the appropriate file
let sourceFile;
if (isProduction) {
  sourceFile = productionFile;
} else {
  sourceFile = stagingFile;
}

if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, targetFile);
} else {
  console.error(`Error: Source file not found: ${sourceFile}`);
  console.error('Make sure both apple-pay-production.txt and apple-pay-staging.txt exist');
  process.exit(1);
}