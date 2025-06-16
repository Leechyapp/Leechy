/**
 * Utility to detect mobile devices including mobile web browsers
 */

// Check if device is mobile based on user agent and screen size
const isMobileDevice = () => {
  // Check user agent for mobile devices
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(userAgent);
  
  // Check for WebView environments that should be treated as mobile
  const webViewRegex = /wv|WebView|; wv\)|Version.*Chrome/i;
  const isWebView = webViewRegex.test(userAgent);
  
  // Check screen size (mobile-like dimensions)
  const isMobileScreen = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    window.screen.width <= 768 ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
  
  return isMobileUA || isMobileScreen || isWebView;
};

// Check if we're in a mobile app WebView (where external links should open in same window)
const isMobileAppWebView = () => {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  
  // Common WebView indicators
  const webViewIndicators = [
    /wv\)/i,                    // Android WebView
    /Version.*Mobile.*Safari/i,  // iOS WebView
    /WebView/i,                 // Generic WebView
    /; wv\)/i,                  // WebView pattern
    /FB.*FBAV/i,                // Facebook WebView
    /Instagram/i,               // Instagram WebView
    /Twitter/i,                 // Twitter WebView
    /Snapchat/i                 // Snapchat WebView
  ];
  
  return webViewIndicators.some(pattern => pattern.test(userAgent));
};

// Check if device supports popup windows reliably
const supportsPopups = () => {
  if (typeof window === 'undefined') return false;
  
  // Mobile devices often don't support popups well
  if (isMobileDevice()) return false;
  
  // WebViews definitely don't support popups
  if (isMobileAppWebView()) return false;
  
  // Test if popup blocking is likely
  try {
    const testPopup = window.open('', 'test', 'width=1,height=1');
    if (testPopup) {
      testPopup.close();
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export { isMobileDevice, isMobileAppWebView, supportsPopups };
export default isMobileDevice; 