/**
 * Emergency Rate Limiting Middleware
 * Designed to stop rapid-fire bot attacks like the current 0.9 CAPTCHA score exploitation
 */

// In-memory store for rate limiting (use Redis in production for scaling)
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now - data.resetTime > 60000) { // Clean entries older than 1 minute
      rateLimitStore.delete(ip);
    }
  }
}, 30000); // Clean every 30 seconds

/**
 * Aggressive rate limiting for payment endpoints
 * Blocks IPs making too many payment attempts
 */
const rateLimitPayments = (maxRequests = 3, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const now = Date.now();
    
    if (!ip) {
      console.warn('⚠️ Could not determine client IP for rate limiting');
      return next();
    }

    // Get or create rate limit data for this IP
    let ipData = rateLimitStore.get(ip);
    
    if (!ipData || now - ipData.resetTime > windowMs) {
      // Reset the counter for this IP
      ipData = {
        count: 0,
        resetTime: now,
        firstRequest: now
      };
    }
    
    ipData.count += 1;
    rateLimitStore.set(ip, ipData);
    
    // Check if limit exceeded
    if (ipData.count > maxRequests) {
      const timeToReset = Math.ceil((ipData.resetTime + windowMs - now) / 1000);
      
      console.log(`🛡️ RATE LIMIT BLOCKED: IP ${ip} exceeded ${maxRequests} requests in ${windowMs/1000}s window (attempt #${ipData.count})`);
      
      return res.status(429).json({
        error: 'Too many requests',
        message: `Too many payment attempts. Please wait ${timeToReset} seconds before trying again.`,
        retryAfter: timeToReset
      });
    }
    
    // Log suspicious activity (more than 1 request in short time)
    if (ipData.count > 1) {
      console.log(`⚠️ RATE LIMIT WARNING: IP ${ip} made ${ipData.count} payment requests in ${(now - ipData.firstRequest)/1000}s`);
    }
    
    next();
  };
};

/**
 * Standard rate limiting for regular endpoints
 */
const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    const now = Date.now();
    
    if (!ip) {
      return next();
    }

    let ipData = rateLimitStore.get(ip);
    
    if (!ipData || now - ipData.resetTime > windowMs) {
      ipData = {
        count: 0,
        resetTime: now,
        firstRequest: now
      };
    }
    
    ipData.count += 1;
    rateLimitStore.set(ip, ipData);
    
    if (ipData.count > maxRequests) {
      const timeToReset = Math.ceil((ipData.resetTime + windowMs - now) / 1000);
      
      console.log(`🛡️ RATE LIMIT BLOCKED: IP ${ip} exceeded ${maxRequests} requests in ${windowMs/1000}s window`);
      
      return res.status(429).json({
        error: 'Too many requests',
        message: `Too many requests. Please wait ${timeToReset} seconds before trying again.`,
        retryAfter: timeToReset
      });
    }
    
    next();
  };
};

/**
 * Emergency IP blocking for known malicious IPs
 * Add IPs that are definitely attacking
 */
const emergencyIPBlock = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
  
  // Known malicious IPs (add to this list as needed)
  const blockedIPs = [
    '209.141.41.49', // The IP from your logs showing suspicious activity
    // Add more IPs as needed
  ];
  
  if (blockedIPs.includes(ip)) {
    console.log(`🚫 EMERGENCY BLOCK: Blocked request from known malicious IP ${ip}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP has been temporarily blocked due to suspicious activity.'
    });
  }
  
  next();
};

module.exports = {
  rateLimitPayments,
  rateLimit,
  emergencyIPBlock,
  // Export store for monitoring
  getRateLimitStats: () => {
    const stats = {};
    for (const [ip, data] of rateLimitStore.entries()) {
      stats[ip] = {
        requests: data.count,
        timeSinceReset: (Date.now() - data.resetTime) / 1000,
        suspicious: data.count > 2
      };
    }
    return stats;
  }
}; 