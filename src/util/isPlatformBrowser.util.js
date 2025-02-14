/**
 * Checks if the platform is a browser or not.
 * @returns {boolean} True if the platform is a browser, false otherwise.
 */
const isPlatformBrowser = () => {
  if (typeof window !== 'undefined') {
    // We are on the server
    return true;
  } else {
    // We are on the client
    return false;
  }
};

export default isPlatformBrowser;
