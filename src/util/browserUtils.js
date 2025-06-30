import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { isMobileDevice, isMobileAppWebView, supportsPopups } from './isMobileDevice';

/**
 * Opens a URL in the most appropriate browser for the current platform
 * - iOS: Uses Safari View Controller with popover presentation
 * - Android: Uses Custom Tabs with fullscreen presentation  
 * - Web: Uses popup windows or same window fallback
 * 
 * @param {string} url - The URL to open
 * @param {Object} options - Configuration options
 * @param {string} options.toolbarColor - Hex color for the toolbar (default: '#635BFF')
 * @param {Function} options.onClose - Callback when browser is closed
 * @param {boolean} options.fallbackToSameWindow - Whether to fallback to same window for mobile web
 * @returns {Promise<void>}
 */
export const openInAppBrowser = async (url, options = {}) => {
  const {
    toolbarColor = '#635BFF',
    onClose,
    fallbackToSameWindow = true
  } = options;

  try {
    if (Capacitor.isNativePlatform()) {
      // Get the platform to customize browser behavior
      const platform = Capacitor.getPlatform();
      
      if (platform === 'ios') {
        // iOS-specific Safari View Controller configuration
        await Browser.open({
          url: url,
          windowName: '_blank',
          toolbarColor: toolbarColor,
          presentationStyle: 'popover', // Use popover for better in-app experience
          // iOS-specific options for Safari View Controller
          width: Math.min(window.innerWidth * 0.9, 800),
          height: Math.min(window.innerHeight * 0.9, 700)
        });
      } else if (platform === 'android') {
        // Android-specific Custom Tabs configuration
        await Browser.open({
          url: url,
          windowName: '_blank',
          toolbarColor: toolbarColor,
          presentationStyle: 'fullscreen'
        });
      } else {
        // Fallback for other platforms
        await Browser.open({
          url: url,
          windowName: '_blank',
          toolbarColor: toolbarColor,
          presentationStyle: 'fullscreen'
        });
      }
      
      // Listen for browser closure to handle callbacks
      if (onClose) {
        const listener = await Browser.addListener('browserFinished', () => {
          onClose();
          listener.remove();
        });
      }
      
    } else {
      // Web browser handling
      if (supportsPopups()) {
        // Desktop with popup support - use popup
        const popupFeatures = 'width=800,height=700,scrollbars=yes,resizable=yes,status=yes,left=' + 
          ((window.innerWidth - 800) / 2) + ',top=' + ((window.innerHeight - 700) / 2);
        const popup = window.open(url, 'stripe-connect', popupFeatures);
        
        if (popup) {
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              if (onClose) onClose();
            }
          }, 1000);
        } else {
          // Popup blocked - fallback to same window if allowed
          if (fallbackToSameWindow) {
            window.location.href = url;
          }
        }
      } else if (isMobileDevice() || isMobileAppWebView()) {
        // Mobile browser - open in same window to prevent external browser redirect
        if (fallbackToSameWindow) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      } else {
        // No popup support - fallback to same window if allowed
        if (fallbackToSameWindow) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      }
    }
  } catch (error) {
    console.error('Failed to open in-app browser:', error);
    // Final fallback - try opening in same window
    if (fallbackToSameWindow) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  }
};

/**
 * Simplified wrapper for opening Stripe Connect onboarding URLs
 * @param {string} url - The Stripe Connect URL
 * @param {Function} onClose - Callback when browser is closed
 * @returns {Promise<void>}
 */
export const openStripeConnectInApp = async (url, onClose) => {
  return openInAppBrowser(url, {
    toolbarColor: '#635BFF',
    onClose: onClose || (() => window.location.reload()),
    fallbackToSameWindow: true
  });
};

/**
 * Simplified wrapper for opening Stripe Dashboard URLs  
 * @param {string} url - The Stripe Dashboard URL
 * @param {Function} onClose - Callback when browser is closed
 * @returns {Promise<void>}
 */
export const openStripeDashboardInApp = async (url, onClose) => {
  return openInAppBrowser(url, {
    toolbarColor: '#635BFF', 
    onClose: onClose,
    fallbackToSameWindow: false // Don't redirect same window for dashboard
  });
}; 