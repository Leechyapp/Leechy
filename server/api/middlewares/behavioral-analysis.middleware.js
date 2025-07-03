/**
 * Behavioral Analysis Middleware
 * Detects bot patterns beyond CAPTCHA verification
 */

// Track user behavior patterns
const behaviorPatterns = new Map();

// Clean up old behavior data
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [ip, data] of behaviorPatterns.entries()) {
    if (now - data.firstSeen > maxAge) {
      behaviorPatterns.delete(ip);
    }
  }
}, 2 * 60 * 1000); // Clean every 2 minutes

/**
 * Analyze request patterns to detect bot behavior
 */
const analyzeBehavior = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
  const userAgent = req.headers['user-agent'] || '';
  const now = Date.now();
  
  if (!ip) {
    return next();
  }
  
  // Get or create behavior data for this IP
  let behavior = behaviorPatterns.get(ip);
  
  if (!behavior) {
    behavior = {
      firstSeen: now,
      requestCount: 0,
      paymentAttempts: 0,
      userAgents: new Set(),
      timings: [],
      suspiciousScore: 0,
      flags: []
    };
  }
  
  // Update behavior data
  behavior.requestCount += 1;
  behavior.userAgents.add(userAgent);
  behavior.timings.push(now);
  
  // Detect payment attempts
  if (req.path.includes('booking') || req.path.includes('payment') || req.path.includes('paypal')) {
    behavior.paymentAttempts += 1;
  }
  
  // Keep only recent timings (last 5 minutes)
  const recentCutoff = now - (5 * 60 * 1000);
  behavior.timings = behavior.timings.filter(t => t > recentCutoff);
  
  // BEHAVIORAL ANALYSIS
  let suspiciousScore = 0;
  const flags = [];
  
  // 1. Too many requests in short time
  if (behavior.timings.length > 10) {
    suspiciousScore += 3;
    flags.push('high_request_frequency');
  }
  
  // 2. Multiple payment attempts rapidly
  if (behavior.paymentAttempts > 3) {
    suspiciousScore += 5;
    flags.push('multiple_payment_attempts');
  }
  
  // 3. Suspicious user agent patterns
  if (userAgent.includes('bot') || userAgent.includes('curl') || userAgent.includes('python')) {
    suspiciousScore += 4;
    flags.push('suspicious_user_agent');
  }
  
  // 4. No user agent (very suspicious)
  if (!userAgent) {
    suspiciousScore += 3;
    flags.push('missing_user_agent');
  }
  
  // 5. Perfect timing patterns (too regular)
  if (behavior.timings.length >= 3) {
    const intervals = [];
    for (let i = 1; i < behavior.timings.length; i++) {
      intervals.push(behavior.timings[i] - behavior.timings[i-1]);
    }
    
    // Check for suspiciously regular intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const regularityScore = intervals.filter(interval => 
      Math.abs(interval - avgInterval) < 1000 // Within 1 second
    ).length / intervals.length;
    
    if (regularityScore > 0.8) {
      suspiciousScore += 2;
      flags.push('regular_timing_pattern');
    }
  }
  
  // 6. Multiple user agents from same IP (suspicious)
  if (behavior.userAgents.size > 3) {
    suspiciousScore += 2;
    flags.push('multiple_user_agents');
  }
  
  // Update behavior data
  behavior.suspiciousScore = suspiciousScore;
  behavior.flags = flags;
  behaviorPatterns.set(ip, behavior);
  
  // Log suspicious behavior
  if (suspiciousScore > 5) {
    console.log(`🤖 SUSPICIOUS BEHAVIOR DETECTED: IP ${ip}, Score: ${suspiciousScore}, Flags: ${flags.join(', ')}`);
  }
  
  // Block if extremely suspicious
  if (suspiciousScore > 8) {
    console.log(`🚫 BEHAVIORAL BLOCK: IP ${ip} blocked for suspicious behavior (score: ${suspiciousScore})`);
    return res.status(403).json({
      error: 'Suspicious behavior detected',
      message: 'Your request pattern appears automated. Please contact support if you believe this is an error.'
    });
  }
  
  // Add behavior data to request for logging
  req.behaviorAnalysis = {
    suspiciousScore,
    flags,
    paymentAttempts: behavior.paymentAttempts,
    requestCount: behavior.requestCount
  };
  
  next();
};

/**
 * Get behavioral analysis stats for monitoring
 */
const getBehaviorStats = () => {
  const stats = {
    totalIPs: behaviorPatterns.size,
    suspicious: 0,
    highRisk: 0,
    details: {}
  };
  
  for (const [ip, behavior] of behaviorPatterns.entries()) {
    if (behavior.suspiciousScore > 3) stats.suspicious++;
    if (behavior.suspiciousScore > 6) stats.highRisk++;
    
    stats.details[ip] = {
      score: behavior.suspiciousScore,
      flags: behavior.flags,
      requests: behavior.requestCount,
      paymentAttempts: behavior.paymentAttempts,
      userAgents: behavior.userAgents.size
    };
  }
  
  return stats;
};

module.exports = {
  analyzeBehavior,
  getBehaviorStats
}; 