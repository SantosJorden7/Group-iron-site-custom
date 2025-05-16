/**
 * Event Listener Registry
 * Centralized management of event listeners to prevent duplicate registrations,
 * handle cleanup, and provide compatibility with the OSRS UI.
 */

class EventListenerRegistry {
  constructor() {
    this.listeners = new Map();
    this.debug = false;
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable debug logs
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Generate a unique key for an event listener
   * @param {EventTarget} target - Element to attach the listener to
   * @param {string} type - Event type
   * @param {Function} listener - Event handler function
   * @returns {string} Unique identifier
   */
  generateKey(target, type, listener) {
    // Use the function toString for part of the key
    const listenerStr = listener.toString().slice(0, 100);
    const targetId = target.id || 'unknown';
    return `${targetId}_${type}_${listenerStr}`;
  }

  /**
   * Add an event listener safely
   * @param {EventTarget} target - Element to attach the listener to
   * @param {string} type - Event type
   * @param {Function} listener - Event handler function
   * @param {object} options - Optional addEventListener options
   * @returns {Function} Function to remove the listener
   */
  add(target, type, listener, options = {}) {
    if (!target) {
      if (this.debug) console.warn(`Cannot add ${type} listener to null target`);
      return () => {};
    }

    try {
      // Check if addEventListener is available
      if (typeof target.addEventListener !== 'function') {
        if (this.debug) console.warn(`Target does not support addEventListener`, target);
        return () => {};
      }

      // Generate a unique key for this listener
      const key = this.generateKey(target, type, listener);

      // Don't add duplicate listeners
      if (this.listeners.has(key)) {
        if (this.debug) console.log(`Skipping duplicate listener for ${type}`);
        return () => this.remove(target, type, listener);
      }

      // Wrap the listener to handle errors and timeouts
      const wrappedListener = (event) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in ${type} event listener:`, error);
        }
      };

      // Save the reference to the wrapped listener
      this.listeners.set(key, {
        original: listener,
        wrapped: wrappedListener,
        target,
        type,
        options
      });

      // Actually add the event listener
      target.addEventListener(type, wrappedListener, options);
      
      if (this.debug) console.log(`Added ${type} listener to ${target.nodeName || 'window/document'}`);

      // Return a function to remove this specific listener
      return () => this.remove(target, type, listener);
    } catch (error) {
      console.error(`Failed to add ${type} event listener:`, error);
      return () => {};
    }
  }

  /**
   * Remove a specific event listener
   * @param {EventTarget} target - Element with the listener
   * @param {string} type - Event type
   * @param {Function} listener - Original event handler function
   * @returns {boolean} Whether the listener was removed
   */
  remove(target, type, listener) {
    if (!target) return false;
    
    try {
      // Check if removeEventListener is available
      if (typeof target.removeEventListener !== 'function') {
        if (this.debug) console.warn(`Target does not support removeEventListener`, target);
        return false;
      }

      // Find the listener in our registry
      const key = this.generateKey(target, type, listener);
      const entry = this.listeners.get(key);
      
      if (!entry) {
        if (this.debug) console.warn(`No registered listener found for ${type}`);
        return false;
      }

      // Remove the actual listener using the wrapped function reference
      target.removeEventListener(type, entry.wrapped, entry.options);
      
      // Remove from our registry
      this.listeners.delete(key);
      
      if (this.debug) console.log(`Removed ${type} listener from ${target.nodeName || 'window/document'}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove ${type} event listener:`, error);
      return false;
    }
  }

  /**
   * Remove all listeners for a target
   * @param {EventTarget} target - Element to clean up listeners for
   */
  removeAll(target) {
    if (!target) return;
    
    try {
      // Find all listeners for this target
      for (const [key, entry] of this.listeners.entries()) {
        if (entry.target === target) {
          try {
            target.removeEventListener(entry.type, entry.wrapped, entry.options);
            this.listeners.delete(key);
          } catch (error) {
            console.error(`Error removing listener ${entry.type}:`, error);
          }
        }
      }
      
      if (this.debug) console.log(`Removed all listeners for ${target.nodeName || 'window/document'}`);
    } catch (error) {
      console.error('Error in removeAll:', error);
    }
  }

  /**
   * Clean up all registered event listeners
   */
  cleanup() {
    try {
      for (const entry of this.listeners.values()) {
        try {
          entry.target.removeEventListener(entry.type, entry.wrapped, entry.options);
        } catch (error) {
          console.error(`Error removing listener in cleanup:`, error);
        }
      }
      
      this.listeners.clear();
      if (this.debug) console.log('Cleaned up all registered event listeners');
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }
}

// Create a singleton instance
const eventListenerRegistry = new EventListenerRegistry();

// For debugging
if (process.env.NODE_ENV === 'development') {
  // Enable debug in development
  eventListenerRegistry.setDebug(true);
  
  // Expose to window for debugging
  window.eventListenerRegistry = eventListenerRegistry;
}

export default eventListenerRegistry;
