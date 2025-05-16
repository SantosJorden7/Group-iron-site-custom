/**
 * Safe Event Listener Utility
 * 
 * Provides a safe way to add event listeners to DOM elements,
 * handling cases where the element may not support addEventListener.
 * 
 * Updated to use the EventListenerRegistry for improved management.
 */

import eventListenerRegistry from './eventListenerRegistry';

/**
 * Checks if a value is a valid DOM node
 * @param {any} node - Value to check
 * @return {boolean} - True if it's a valid node
 */
function isValidNode(node) {
  if (!node) return false;
  
  // Check for Window object
  if (node === window || 
      (typeof Window !== 'undefined' && node instanceof Window)) {
    return true;
  }
  
  // Check for Document object
  if (node === document || 
      (typeof Document !== 'undefined' && node instanceof Document)) {
    return true;
  }
  
  // Check for DOM Node
  try {
    // Most reliable check, works across browsers
    return node.nodeType !== undefined;
  } catch (e) {
    return false;
  }
}

/**
 * Adds an event listener safely to a DOM node, with fallbacks if addEventListener is not supported
 * @param {object} node - DOM node to attach listener to
 * @param {string} eventType - Event type to listen for
 * @param {function} handler - Event handler function
 * @param {object} [options] - Event listener options
 * @return {function} - Cleanup function to remove the listener
 */
export default function addSafeEventListener(node, eventType, handler, options = {}) {
  // Check for null/undefined node
  if (!node) {
    console.warn('[addSafeEventListener] Cannot add listener: node is null or undefined', {eventType, handler});
    return () => {};
  }
  
  // Special case for window and document (often used)
  if (node === window || node === document) {
    try {
      node.addEventListener(eventType, handler, options);
      return () => {
        try {
          node.removeEventListener(eventType, handler, options);
        } catch (err) {
          console.warn(`[addSafeEventListener] Error removing listener from window/document:`, err);
        }
      };
    } catch (err) {
      console.warn('[addSafeEventListener] Failed to add listener to window/document, trying property assignment', err);
      
      // Direct property assignment fallback for window/document
      const propertyName = `on${eventType}`;
      const oldHandler = node[propertyName];
      node[propertyName] = function(event) {
        handler(event);
        if (oldHandler) oldHandler.call(this, event);
      };
      
      return () => { 
        node[propertyName] = oldHandler;
      };
    }
  }

  // For DOM nodes, validate that node is a proper DOM node
  if (!isValidNode(node)) {
    console.warn('[addSafeEventListener] Invalid node provided:', node);
    return () => {};
  }
  
  // For CustomElements or Web Components, they may have their own event system
  if (node.customAddEventListener && typeof node.customAddEventListener === 'function') {
    try {
      node.customAddEventListener(eventType, handler, options);
      return () => {
        if (node.customRemoveEventListener) {
          node.customRemoveEventListener(eventType, handler, options);
        }
      };
    } catch (customErr) {
      console.warn('[addSafeEventListener] Error using customAddEventListener:', customErr);
      // Continue to try other methods
    }
  }
  
  // Standard addEventListener
  try {
    if (typeof node.addEventListener === 'function') {
      node.addEventListener(eventType, handler, options);
      return () => {
        try {
          node.removeEventListener(eventType, handler, options);
        } catch (err) {
          console.warn('[addSafeEventListener] Error removing event listener:', err);
        }
      };
    } else {
      console.warn('[addSafeEventListener] Failed to add event listener, falling back to property assignment', {
        node,
        eventType,
        nodeProperties: Object.keys(node)
      });
    }
  } catch (err) {
    console.warn('[addSafeEventListener] Error while adding event listener:', err);
  }
  
  // Fallback to on[event] property if addEventListener is not supported
  try {
    const propertyName = `on${eventType}`;
    const oldHandler = node[propertyName];
    
    if (typeof node[propertyName] !== 'undefined') {
      // Property exists, so we can use it as fallback
      node[propertyName] = function(event) {
        handler(event);
        if (oldHandler) oldHandler.call(this, event);
      };
      
      return () => {
        node[propertyName] = oldHandler;
      };
    }
  } catch (propErr) {
    console.warn('[addSafeEventListener] Error setting on-property handler:', propErr);
  }
  
  // Last resort: try to use a global event bus (pubsub pattern)
  if (window.pubsub && typeof window.pubsub.on === 'function') {
    try {
      window.pubsub.on(eventType, handler);
      return () => {
        if (window.pubsub && window.pubsub.off) {
          window.pubsub.off(eventType, handler);
        }
      };
    } catch (pubsubErr) {
      console.warn('[addSafeEventListener] Error using pubsub fallback:', pubsubErr);
    }
  }
  
  // If all else fails
  console.warn('[addSafeEventListener] Failed to attach event listener - no suitable method found', {
    node, 
    eventType, 
    nodeProperties: Object.keys(node)
  });
  
  return () => {}; // Return empty cleanup function
}

// Export a global function for diagnostics and debugging
window.safeAddEventListener = addSafeEventListener;

/**
 * Safely removes an event listener from a target element
 * @param {EventTarget} target - Element with the listener
 * @param {string} type - Event type
 * @param {Function} listener - Original event handler function
 * @returns {boolean} Whether the listener was removed
 */
export function safeRemoveEventListener(target, type, listener) {
  if (!target) return false;
  
  // Handle window and document globals
  if (target === 'window' || target === window) {
    try {
      window.removeEventListener(type, listener);
      return true;
    } catch (err) {
      console.error('[safeRemoveEventListener] ERROR calling removeEventListener on window:', {
        target,
        type,
        listener,
        stack: err.stack,
        err
      });
      return false;
    }
  }
  
  if (target === 'document' || target === document) {
    try {
      document.removeEventListener(type, listener);
      return true;
    } catch (err) {
      console.error('[safeRemoveEventListener] ERROR calling removeEventListener on document:', {
        target,
        type,
        listener,
        stack: err.stack,
        err
      });
      return false;
    }
  }
  
  try {
    // Standard DOM approach
    if (typeof target.removeEventListener === 'function') {
      target.removeEventListener(type, listener);
      return true;
    }
    
    // Handle custom events
    if (!type.startsWith('on') && typeof target[`on${type}`] === 'function') {
      target[`on${type}`] = null;
      return true;
    } else if (typeof target[type] === 'function') {
      target[type] = null;
      return true;
    }
    
    // PubSub-like objects
    if (typeof target.off === 'function') {
      target.off(type, listener);
      return true;
    }
    
    // Subscribe/unsubscribe pattern
    if (typeof target.unsubscribe === 'function') {
      target.unsubscribe(type, listener);
      return true;
    }
    
    // Custom event system
    if (target._eventHandlers && target._eventHandlers[type]) {
      const index = target._eventHandlers[type].indexOf(listener);
      if (index !== -1) {
        target._eventHandlers[type].splice(index, 1);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error in safeRemoveEventListener for ${type}:`, error);
    return false;
  }
}

/**
 * Safely removes all event listeners from a target element
 * @param {EventTarget} target - Element to clean up listeners for
 */
export function safeRemoveAllEventListeners(target) {
  if (!target) return;
  
  try {
    // Custom event system cleanup
    if (target._eventHandlers) {
      target._eventHandlers = {};
    }
    
    return eventListenerRegistry.removeAll(target);
  } catch (error) {
    console.error('Error in safeRemoveAllEventListeners:', error);
  }
}

/**
 * Cleans up all registered event listeners
 */
export function cleanupAllEventListeners() {
  return eventListenerRegistry.cleanup();
}
