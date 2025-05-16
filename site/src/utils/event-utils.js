/**
 * Event Utilities
 * 
 * Provides robust event handling utilities specifically designed
 * for the Group Iron site, handling edge cases and providing
 * graceful fallbacks for event-related operations.
 */

import addSafeEventListener from './addEventListener';

/**
 * Map of registered event listeners for cleanup
 * @type {Map<string, Array<Function>>}
 */
const eventListenerMap = new Map();

/**
 * Add a group data update listener safely
 * 
 * @param {Function} handler - Event handler function
 * @param {Object} options - Options object
 * @param {boolean} options.useWindowEvent - Whether to use native window events (default: true)
 * @param {boolean} options.usePubSub - Whether to use pubsub system (default: true)
 * @return {Function} - Cleanup function to remove listeners
 */
export function addGroupDataListener(handler, options = {}) {
  const { 
    useWindowEvent = true, 
    usePubSub = true 
  } = options;
  
  const cleanupFunctions = [];
  const eventName = 'group-data-updated';
  
  // Track listeners for this event
  if (!eventListenerMap.has(eventName)) {
    eventListenerMap.set(eventName, []);
  }
  const listeners = eventListenerMap.get(eventName);
  listeners.push(handler);
  
  // Add listener via window event if enabled
  if (useWindowEvent) {
    try {
      const cleanup = addSafeEventListener(window, eventName, handler);
      cleanupFunctions.push(cleanup);
    } catch (err) {
      console.warn(`[event-utils] Failed to add ${eventName} listener to window:`, err);
    }
  }
  
  // Add listener via pubsub if enabled
  if (usePubSub && window.pubsub) {
    try {
      if (typeof window.pubsub.on === 'function') {
        window.pubsub.on(eventName, handler);
        cleanupFunctions.push(() => {
          if (window.pubsub && typeof window.pubsub.off === 'function') {
            window.pubsub.off(eventName, handler);
          }
        });
      } else {
        console.warn(`[event-utils] window.pubsub.on is not a function`);
      }
    } catch (err) {
      console.warn(`[event-utils] Failed to add ${eventName} listener via pubsub:`, err);
    }
  }
  
  // Return composite cleanup function
  return () => {
    // Remove from tracked listeners
    const index = listeners.indexOf(handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // Call all cleanup functions
    cleanupFunctions.forEach(cleanup => {
      try {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      } catch (err) {
        console.warn('[event-utils] Error during listener cleanup:', err);
      }
    });
  };
}

/**
 * Trigger a group data update event
 * 
 * @param {Object} data - Event data to include
 */
export function triggerGroupDataUpdate(data = {}) {
  // Try native DOM event dispatch
  try {
    const event = new CustomEvent('group-data-updated', { detail: data });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('[event-utils] Failed to dispatch group-data-updated event:', err);
  }
  
  // Try pubsub
  try {
    if (window.pubsub && typeof window.pubsub.publish === 'function') {
      window.pubsub.publish('group-data-updated', data);
    }
  } catch (err) {
    console.warn('[event-utils] Failed to publish group-data-updated via pubsub:', err);
  }
  
  // Call any registered event listeners directly as a fallback
  try {
    const listeners = eventListenerMap.get('group-data-updated') || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        console.warn('[event-utils] Error in group-data-updated listener:', err);
      }
    });
  } catch (err) {
    console.warn('[event-utils] Failed to call listeners directly:', err);
  }
}

/**
 * Remove all group data listeners
 */
export function removeAllGroupDataListeners() {
  const eventName = 'group-data-updated';
  const listeners = eventListenerMap.get(eventName) || [];
  
  // Clear listeners array
  eventListenerMap.set(eventName, []);
  
  // Try to remove from window
  listeners.forEach(handler => {
    try {
      window.removeEventListener(eventName, handler);
    } catch (err) {
      // Ignore errors in cleanup
    }
    
    try {
      if (window.pubsub && typeof window.pubsub.off === 'function') {
        window.pubsub.off(eventName, handler);
      }
    } catch (err) {
      // Ignore errors in cleanup
    }
  });
}

// Export as global utility
window.GroupEvents = {
  addGroupDataListener,
  triggerGroupDataUpdate,
  removeAllGroupDataListeners
};
