import { LOCATION_CHANGED } from '../ducks/routing.duck';

// Create a Redux middleware from the given analytics handlers. Each
// handler should have the following methods:
//
// - trackPageView(canonicalPath, previousPath): called when the URL is changed
export const createMiddleware = handlers => store => next => action => {
  // Guard against invalid actions to prevent Redux error #7
  if (!action || typeof action !== 'object' || !action.type) {
    console.warn('Invalid action dispatched:', action);
    return;
  }

  const { type, payload } = action;

  if (type === LOCATION_CHANGED) {
    const previousPath = store?.getState()?.routing?.currentCanonicalPath;
    const { canonicalPath } = payload;
    handlers.forEach(handler => {
      handler.trackPageView(canonicalPath, previousPath);
    });
  }

  next(action);
};
