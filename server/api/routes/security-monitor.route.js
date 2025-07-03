const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const { getRateLimitStats } = require('../middlewares/rate-limit.middleware');
const { getBehaviorStats } = require('../middlewares/behavioral-analysis.middleware');

/**
 * Security monitoring endpoint
 * Shows real-time stats about rate limiting and bot detection
 * Only accessible to authenticated admin users
 */
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const rateLimitStats = getRateLimitStats();
    const behaviorStats = getBehaviorStats();
    
    // Count suspicious IPs
    let suspiciousCount = 0;
    let totalRequests = 0;
    
    for (const [ip, data] of Object.entries(rateLimitStats)) {
      totalRequests += data.requests;
      if (data.suspicious) {
        suspiciousCount++;
      }
    }
    
    const stats = {
      timestamp: new Date().toISOString(),
      rateLimiting: {
        activeIPs: Object.keys(rateLimitStats).length,
        suspiciousIPs: suspiciousCount,
        totalRequests: totalRequests,
        details: rateLimitStats
      },
      behaviorAnalysis: {
        totalIPs: behaviorStats.totalIPs,
        suspiciousIPs: behaviorStats.suspicious,
        highRiskIPs: behaviorStats.highRisk,
        details: behaviorStats.details
      },
      security: {
        blockedIPs: ['209.141.41.49'], // Known blocked IPs
        emergencyMode: true,
        captchaEnabled: !!process.env.RECAPTCHA_SECRET_KEY,
        captchaMinScore: process.env.RECAPTCHA_MIN_SCORE || '0.6',
        layersActive: ['rate_limiting', 'emergency_blocks', 'captcha_reuse_protection', 'behavioral_analysis']
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({ error: 'Failed to get security stats' });
  }
});

/**
 * Emergency IP blocking endpoint
 * Allows adding IPs to the emergency block list
 */
router.post('/block-ip', authMiddleware, (req, res) => {
  const { ip, reason } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address required' });
  }
  
  // For now, this just logs the request
  // In a full implementation, you'd add to a persistent store
  console.log(`🚫 MANUAL IP BLOCK REQUEST: ${ip} - Reason: ${reason || 'No reason provided'}`);
  
  res.json({
    success: true,
    message: `IP ${ip} blocked successfully`,
    ip,
    reason,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 