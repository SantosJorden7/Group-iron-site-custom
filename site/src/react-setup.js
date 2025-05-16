/**
 * React integration setup
 * This file manages the initialization of React components within the OSRS UI
 */

import React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import { initPanelVisibilityDebug, fixPanelVisibility } from './utils/panel-visibility-debug';
import addSafeEventListener from './utils/addEventListener';

console.log("React setup initializing...");

/**
 * Initialize panel container for React components
 */
function initializePanelContainer() {
  let appElement = document.getElementById('app');
  
  if (!appElement) {
    console.log("App element not found, creating it");
    appElement = document.createElement('div');
    appElement.id = 'app';
    document.body.appendChild(appElement);
  }
  
  // Make the app element visible
  appElement.style.display = 'block';
  appElement.style.visibility = 'visible';
  appElement.style.opacity = '1';
  
  // Check if we need to create authenticated section
  let authedSection = document.querySelector('.authed-section');
  
  if (!authedSection) {
    console.log("Authed section not found, creating it");
    authedSection = document.createElement('div');
    authedSection.className = 'authed-section';
    appElement.appendChild(authedSection);
  }
  
  // Make sure the authed section is visible
  authedSection.style.display = 'flex';
  authedSection.style.visibility = 'visible';
  authedSection.style.opacity = '1';
  
  // Check for main content section
  let mainContent = document.querySelector('.authed-section__main-content');
  
  if (!mainContent) {
    console.log("Main content section not found, creating it");
    mainContent = document.createElement('div');
    mainContent.className = 'authed-section__main-content';
    authedSection.appendChild(mainContent);
  }
  
  // Make sure main content is visible
  mainContent.style.display = 'block';
  mainContent.style.visibility = 'visible';
  mainContent.style.opacity = '1';
  
  // Check for the panel container
  let panelContainer = document.querySelector('.main-content__panel-container');
  
  if (!panelContainer) {
    console.log("Panel container not found, creating it");
    panelContainer = document.createElement('div');
    panelContainer.className = 'main-content__panel-container';
    mainContent.appendChild(panelContainer);
  }
  
  // Make panel container visible
  panelContainer.style.display = 'flex';
  panelContainer.style.visibility = 'visible';
  panelContainer.style.opacity = '1';
  
  // Check for React panels container
  let reactPanels = document.getElementById('react-panels');
  
  if (!reactPanels) {
    console.log("React panels container not found, creating it");
    reactPanels = document.createElement('div');
    reactPanels.id = 'react-panels';
    reactPanels.className = 'react-panels';
    panelContainer.appendChild(reactPanels);
  }
  
  // Make React panels visible
  reactPanels.style.display = 'block';
  reactPanels.style.visibility = 'visible';
  reactPanels.style.opacity = '1';
  
  // Check for side panel
  const sidePanel = document.querySelector('side-panel');
  if (!sidePanel) {
    console.log("Side panel not found, creating it");
    const sidePanelElement = document.createElement('side-panel');
    authedSection.insertBefore(sidePanelElement, mainContent);
  }
  
  return reactPanels;
}

// Register a MutationObserver to ensure React panels are visible
function ensurePanelsVisible() {
  // Force all panels to be visible
  const panels = document.querySelectorAll('.react-panel, .feature-panel, side-panel, .side-panel, app-navigation, .app-navigation');
  panels.forEach(panel => {
    if (panel) {
      panel.style.display = panel.tagName === 'APP-NAVIGATION' ? 'flex' : 'block';
      panel.style.visibility = 'visible';
      panel.style.opacity = '1';
      
      // If this is side-panel, make sure it's the correct width
      if (panel.tagName === 'SIDE-PANEL' || panel.className.includes('side-panel')) {
        panel.style.minWidth = '256px';
      }
    }
  });
  
  console.log("Force made panels visible");
}

// Function to mount React app - updated for React 18+
function mountReactApp() {
  const rootElement = initializePanelContainer();
  
  if (rootElement) {
    // Check if React is already mounted
    if (!rootElement.hasChildNodes()) {
      try {
        // Use createRoot for React 18+
        const root = ReactDOM.createRoot(rootElement);
        root.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
        console.log("Successfully rendered React app using createRoot");
      } catch (error) {
        console.error("Failed to render React app:", error);
      }
    }
  }
}

// Initialize observer to monitor DOM changes
function setupMutationObserver() {
  try {
    // Create a new observer
    const observer = new MutationObserver((mutations) => {
      // Check if our target elements exist yet
      const reactPanels = document.getElementById('react-panels');
      const mainContent = document.querySelector('.authed-section__main-content');
      
      if (reactPanels && mainContent) {
        ensurePanelsVisible();
      } else {
        // Target not found, check if we should create all containers
        const appElement = document.getElementById('app');
        if (appElement) {
          // Initialize panel containers if app is present
          initializePanelContainer();
          ensurePanelsVisible();
        }
      }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    return observer;
  } catch (error) {
    console.error("Failed to setup mutation observer:", error);
    return null;
  }
}

// Initialize React components when DOM is loaded
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Use our safe event listener utility to avoid errors
  try {
    // Ensure panels are visible even before DOMContentLoaded
    ensurePanelsVisible();
    initializePanelContainer();
    
    // Use safe event listener for DOMContentLoaded
    addSafeEventListener(document, 'DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired, setting up React app...');
      
      // Import all features here
      try {
        import('./features').then(() => {
          console.log("Successfully imported features");
          
          // Mount React app
          mountReactApp();
          
          // Setup mutation observer
          const observer = setupMutationObserver();
          
          // Initialize panel visibility debugging directly
          try {
            console.log('Initializing panel debug tools...');
            // Use try/catch here since we've had issues with this function
            try {
              const cleanup = initPanelVisibilityDebug();
              
              // Save cleanup function to window for later use
              window.cleanupReactDebug = cleanup;
            } catch (debugErr) {
              console.warn('Debug tools initialization error (non-critical):', debugErr);
            }
            
            // Force panels visible after a short delay
            setTimeout(() => {
              ensurePanelsVisible();
              try {
                fixPanelVisibility();
              } catch (e) {
                console.warn('Error fixing panel visibility (non-critical):', e);
              }
            }, 500);
            
            // Force panels visible after a longer delay
            setTimeout(() => {
              ensurePanelsVisible();
              try {
                fixPanelVisibility();
              } catch (e) {
                console.warn('Error fixing panel visibility (non-critical):', e);
              }
              
              // Remove the app loader if it exists
              const appLoader = document.querySelector('.app-loader');
              if (appLoader) {
                appLoader.remove();
                console.log("Removing app loader as app should be initialized by now");
              }
            }, 2000);
          } catch (err) {
            console.warn('Failed to initialize debug tools (non-critical):', err);
            // Still ensure panels are visible even if debug tools fail
            ensurePanelsVisible();
          }
        }).catch((error) => {
          console.error("Failed to import features:", error);
          // Still try to ensure panels are visible
          ensurePanelsVisible();
        });
      } catch (importErr) {
        console.error("Error importing features:", importErr);
        // Still try to render what we can
        mountReactApp();
        ensurePanelsVisible();
      }
    });
  } catch (domErr) {
    console.error("Error setting up DOMContentLoaded handler:", domErr);
    // Try direct initialization as fallback
    setTimeout(() => {
      mountReactApp();
      ensurePanelsVisible();
    }, 100);
  }

  // Add special handlers for error events
  try {
    addSafeEventListener(window, 'error', (event) => {
      console.error('Global error caught:', event.error || event.message);
      
      // Try to recover UI if this might be related to panel visibility
      if (event.message && 
        (event.message.includes('null') || 
          event.message.includes('undefined') || 
          event.message.includes('render'))) {
        console.log('Attempting to recover from error by ensuring panel visibility');
        ensurePanelsVisible();
        try {
          fixPanelVisibility();
        } catch (e) {
          console.warn('Error fixing panel visibility (non-critical):', e);
        }
      }
    });

    addSafeEventListener(window, 'unhandledrejection', (event) => {
      console.error('Global unhandledrejection:', event.reason);
      // Always try to ensure panels are visible on any error
      ensurePanelsVisible();
    });
  } catch (eventErr) {
    console.warn("Error setting up global error handlers (non-critical):", eventErr);
  }

  // Force immediate init even before DOMContentLoaded
  setTimeout(() => {
    console.log("Forcing immediate initialization");
    mountReactApp();
    ensurePanelsVisible();
  }, 0);
}

console.log("React setup complete - waiting for panels");
