/**
 * Safe Style Utilities
 * 
 * Provides safe wrappers around style-related functions to prevent
 * common errors like stack overflow in getComputedStyle and
 * infinite recursion in ownerWindow lookups.
 */

// Track nodes that are currently being processed to prevent recursion
const processingNodes = new Set();
// Generate a unique prefix for node keys to avoid collisions
const NODE_ID_PREFIX = `node_${Date.now().toString(36)}`;
let nodeIdCounter = 0;

/**
 * Safely get computed style for an element with recursion protection
 * 
 * @param {Element} element - The DOM element to get styles for
 * @param {string|null} pseudoElt - Optional pseudo-element string
 * @return {CSSStyleDeclaration|Object} - Style object or fallback empty object
 */
export function safeGetComputedStyle(element, pseudoElt) {
  // Guard against null/undefined elements
  if (!element) {
    console.warn('[safeGetComputedStyle] Null or undefined element provided');
    return createEmptyStyleObject();
  }
  
  // Basic type checking
  if (typeof element !== 'object') {
    console.warn('[safeGetComputedStyle] Element is not an object:', element);
    return createEmptyStyleObject();
  }
  
  // Prevent infinite recursion
  const nodeKey = getNodeKey(element);
  if (processingNodes.has(nodeKey)) {
    console.warn('[safeGetComputedStyle] Recursion detected for element');
    return createEmptyStyleObject();
  }
  
  // Add to processing set to prevent recursion
  processingNodes.add(nodeKey);
  
  try {
    // Find the correct window object to use
    const win = safeGetOwnerWindow(element);
    
    // Use the window's getComputedStyle if available
    if (win && typeof win.getComputedStyle === 'function') {
      return win.getComputedStyle(element, pseudoElt);
    }
    
    // Fallback to global window
    if (window && typeof window.getComputedStyle === 'function') {
      return window.getComputedStyle(element, pseudoElt);
    }
    
    // Last resort: use inline style if available
    if (element.style) {
      return element.style;
    }
    
    console.warn('[safeGetComputedStyle] No getComputedStyle method available for element');
    return createEmptyStyleObject();
  } catch (err) {
    console.warn('[safeGetComputedStyle] Error getting computed style:', err);
    return createEmptyStyleObject();
  } finally {
    // Always remove from processing set
    processingNodes.delete(nodeKey);
  }
}

/**
 * Safely get the owner window of an element
 * 
 * @param {Element} element - DOM element to find owner window for
 * @return {Window|null} - Owner window or null if not found
 */
export function safeGetOwnerWindow(element) {
  if (!element) return window;
  
  // Prevent infinite recursion
  const nodeKey = getNodeKey(element);
  if (processingNodes.has(nodeKey)) {
    return window;
  }
  
  processingNodes.add(nodeKey);
  
  try {
    // Check common properties that reference the owner window
    if (element.ownerDocument && element.ownerDocument.defaultView) {
      return element.ownerDocument.defaultView;
    }
    
    // Try to find ownerDocument
    if (element.ownerDocument) {
      return element.ownerDocument.defaultView || window;
    }
    
    // Check if element is a window object itself
    if (element.document && element.location && element.alert) {
      return element;
    }
    
    // Fallback to global window
    return window;
  } catch (err) {
    console.warn('[safeGetOwnerWindow] Error getting owner window:', err);
    return window;
  } finally {
    processingNodes.delete(nodeKey);
  }
}

/**
 * Generate a unique key for a DOM node to track processing
 * Fixed to avoid recursion issues with Math.random
 * 
 * @param {Element} node - DOM node to generate key for
 * @return {string} - A key representing the node
 */
function getNodeKey(node) {
  // Use node's unique properties if possible
  if (node.id) {
    return `id:${node.id}`;
  }
  
  if (node.dataset && node.dataset.testid) {
    return `testid:${node.dataset.testid}`;
  }
  
  // If node has an internal key property, use that
  if (node._nodeKey) {
    return node._nodeKey;
  }
  
  // Assign a stable unique ID without using Math.random()
  const uniqueId = `${NODE_ID_PREFIX}_${nodeIdCounter++}`;
  
  // Store it on the node if possible to reuse later
  try {
    Object.defineProperty(node, '_nodeKey', {
      value: uniqueId,
      enumerable: false,
      configurable: true
    });
  } catch (e) {
    // Ignore errors if we can't set the property
  }
  
  // Fallback to constructor name + unique ID
  const constructor = node.constructor ? node.constructor.name : 'unknown';
  return `${constructor}:${uniqueId}`;
}

/**
 * Create an empty style object that won't throw on property access
 * 
 * @return {Object} - Empty style-like object
 */
function createEmptyStyleObject() {
  const handler = {
    get: function(target, prop) {
      // For common style properties, return empty values
      if (typeof prop === 'string') {
        // Color properties
        if (prop.includes('color')) return '';
        // Size properties
        if (prop.includes('width') || prop.includes('height') || 
            prop.includes('margin') || prop.includes('padding')) return '0px';
        // Display properties  
        if (prop === 'display') return 'block';
        if (prop === 'visibility') return 'visible';
        // Return empty string for any other style property
        return '';
      }
      return target[prop];
    }
  };
  
  return new Proxy({}, handler);
}

// Patch the global window.getComputedStyle in development mode
if (process.env.NODE_ENV === 'development') {
  const originalGetComputedStyle = window.getComputedStyle;
  
  window.getComputedStyle = function(element, pseudoElt) {
    return safeGetComputedStyle(element, pseudoElt);
  };
  
  console.info('[safe-style-utils] Patched window.getComputedStyle with safe version');
}

// Export the utility for direct usage
window.safeGetComputedStyle = safeGetComputedStyle;
window.safeGetOwnerWindow = safeGetOwnerWindow;
