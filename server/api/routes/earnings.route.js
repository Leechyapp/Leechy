const express = require('express');
const router = express.Router();
const EarningsController = require('../controllers/earnings.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Unified earnings routes for multi-payment-method earnings
router.post('/unified-balance', authMiddleware, EarningsController.getUnifiedBalance);
router.post('/create-unified-payout', authMiddleware, EarningsController.createUnifiedPayout);

module.exports = router; 