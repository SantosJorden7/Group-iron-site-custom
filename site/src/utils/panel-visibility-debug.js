/**
 * Panel Visibility Debugging Utility
 * 
 * This utility helps diagnose panel visibility and initialization issues
 * by monitoring the DOM and logging when panels become visible or hidden.
 */

import { logError, logDebug, logWarn } from './logger';

// Panel selectors to monitor
const PANEL_SELECTORS = [
  '.react-panel',
  '.feature-panel',
  'side-panel',
  '.side-panel',
  'app-navigation',
  '.app-navigation',
  '.main-content__panel-container',
  '#react-panels',
  '.authed-section',
  '.authed-section__main-content'
];

/**
 * Diagnostic function to log panel visibility errors in the console
 */
const logVisibilityError = (message, error) => {
  logError(
    `PANEL ERROR: ${message}`, 
    error
  );
};

/**
 * Diagnostic function to log panel visibility info in the console
 */
function logInfo(message, data) {
  console.log(
    `%c PANEL INFO %c ${message}`,
    'background: #55aaff; color: white; padding: 2px 4px; border-radius: 2px;',
    'color: #55aaff;',
    data || ''
  );
}

/**
 * Monitor the document for errors that might be related to panel visibility
 */
function monitorForErrors() {
  // Listen for all JavaScript errors
  window.addEventListener('error', (event) => {
    // Check if the error is related to a panel or React component
    const errorMsg = event.message || '';
    if (
      errorMsg.includes('panel') ||
      errorMsg.includes('React') ||
      errorMsg.includes('addEventListener') ||
      errorMsg.includes('DOM')
    ) {
      logVisibilityError('Panel/React error:', event);
    }
  });

  // Listen for React errors
  window.addEventListener('unhandledrejection', (event) => {
    logVisibilityError('Unhandled Promise Rejection (possibly React):', event.reason);
  });
}

/**
 * Setup a MutationObserver to monitor panel visibility changes
 */
function monitorPanelVisibility() {
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // Check if this mutation involves one of our target elements
        if (mutation.target && 
            PANEL_SELECTORS.some(selector => 
              mutation.target.matches && mutation.target.matches(selector)
            )) {
          
          // For attribute changes that might affect visibility
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'style' || 
               mutation.attributeName === 'class' || 
               mutation.attributeName === 'hidden')) {
            
            const isVisible = getElementVisibility(mutation.target);
            logInfo(
              `Panel ${isVisible ? 'VISIBLE' : 'HIDDEN'}: ${getElementDescription(mutation.target)}`,
              { element: mutation.target, visibilityState: isVisible }
            );
          }
          
          // For added/removed nodes that might be panels
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && // Element node
                  PANEL_SELECTORS.some(selector => 
                    node.matches && node.matches(selector)
                  )) {
                logInfo(`Panel ADDED: ${getElementDescription(node)}`, node);
              }
            });
            
            mutation.removedNodes.forEach(node => {
              if (node.nodeType === 1 && // Element node
                  PANEL_SELECTORS.some(selector => 
                    node.matches && node.matches(selector)
                  )) {
                logInfo(`Panel REMOVED: ${getElementDescription(node)}`, node);
              }
            });
          }
        }
      });
    });
    
    // Start observing the whole document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });
    
    return observer;
  } catch (error) {
    logVisibilityError('Failed to setup visibility observer:', error);
    return null;
  }
}

/**
 * Check if an element is visually hidden
 */
function getElementVisibility(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         !element.hasAttribute('hidden');
}

/**
 * Get a descriptive string for an element
 */
function getElementDescription(element) {
  if (!element) return 'unknown';
  
  let description = element.tagName.toLowerCase();
  
  if (element.id) {
    description += `#${element.id}`;
  }
  
  if (element.className && typeof element.className === 'string') {
    description += `.${element.className.split(' ').join('.')}`;
  }
  
  return description;
}

/**
 * Generate a report of all panels and their current visibility state
 */
function generatePanelReport() {
  const report = {
    timestamp: new Date().toISOString(),
    panels: []
  };
  
  // Check all potential panel elements
  PANEL_SELECTORS.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      report.panels.push({
        selector,
        element: getElementDescription(element),
        visible: getElementVisibility(element),
        rect: element.getBoundingClientRect()
      });
    });
  });
  
  logInfo('Panel Visibility Report:', report);
  return report;
}

/**
 * Fix any visibility issues detected in panels
 */
export function fixPanelVisibility() {
  PANEL_SELECTORS.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!getElementVisibility(element)) {
        // Force the element to be visible
        element.style.display = element.tagName === 'APP-NAVIGATION' ? 'flex' : 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        if (element.hasAttribute('hidden')) {
          element.removeAttribute('hidden');
        }
        
        logInfo(`Fixed visibility for: ${getElementDescription(element)}`);
      }
    });
  });
}

/**
 * Initialize debugging tools for panel visibility
 */
export function initPanelVisibilityDebug() {
  logInfo('Panel visibility debugging initialized');
  
  // Monitor for errors
  monitorForErrors();
  
  // Monitor panel visibility changes
  const observer = monitorPanelVisibility();
  
  // Generate initial report
  generatePanelReport();
  
  // Fix any initial visibility issues
  fixPanelVisibility();
  
  // Set up periodic checks
  const intervalId = setInterval(() => {
    generatePanelReport();
    fixPanelVisibility();
  }, 5000); // Check every 5 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    if (observer) {
      observer.disconnect();
    }
    logInfo('Panel visibility debugging terminated');
  };
}

// Set up initialization function to be called from react-setup.js
export function initializeDebugTools() {
  if (typeof window !== 'undefined') {
    try {
      // Register global methods for debugging
      window.panelDebug = initPanelVisibilityDebug();
      window.generatePanelReport = generatePanelReport;
      window.fixPanelVisibility = fixPanelVisibility;
      console.log('Panel visibility debug tools registered globally');
    } catch (err) {
      logVisibilityError('Failed to initialize panel debug tools:', err);
    }
  }
}

// Export the module with all utilities
export default {
  initPanelVisibilityDebug,
  generatePanelReport,
  fixPanelVisibility,
  initializeDebugTools
};
