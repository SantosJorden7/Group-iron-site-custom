// Define pubsub BEFORE any imports to ensure it's available globally
// --- Ensure pubsub is available before any imports ---

// Create a true global pubsub that isn't affected by module loading
(function(global) {
  // Define pubsub in the global scope
  if (!global.pubsub) {
    function subscribe(topic, callback) {
      document.addEventListener(topic, (e) => callback(e.detail));
    }

    global.pubsub = {
      subscribe: subscribe,
      on: subscribe, // Alias for plugin compatibility
      off: function(topic, callback) {
        try {
          document.removeEventListener(topic, callback);
        } catch (err) {
          console.warn(`[pubsub] Error removing listener for ${topic}:`, err);
        }
      },
      publish: function(topic, data) {
        try {
          document.dispatchEvent(new CustomEvent(topic, { detail: data }));
        } catch (err) {
          console.warn(`[pubsub] Error publishing to ${topic}:`, err);
        }
      },
      // Dev mode safety methods
      __isDev: true,
      __lastCalled: {},
      __warnIfUnavailable: function(method) {
        if (this.__isDev && (!global.pubsub || typeof global.pubsub[method] !== 'function')) {
          const trace = new Error().stack.split('\n').slice(2).join('\n');
          console.warn(`[pubsub] global.pubsub.${method} was called before being defined\nStack trace: ${trace}`);
          return false;
        }
        this.__lastCalled[method] = Date.now();
        return true;
      }
    };

    // Ensure all methods are safely callable even if overwritten
    const originalPubsub = { ...global.pubsub };
    
    // Create globally available fallback methods
    global.safePublish = function(...args) {
      if (global.pubsub && typeof global.pubsub.publish === 'function') {
        return global.pubsub.publish(...args);
      } else if (originalPubsub && typeof originalPubsub.publish === 'function') {
        console.warn(`[pubsub] Using fallback publish implementation`);
        return originalPubsub.publish(...args);
      }
      console.warn(`[pubsub] publish not available`);
      return undefined;
    };
    
    global.safeSubscribe = function(...args) {
      if (global.pubsub && typeof global.pubsub.subscribe === 'function') {
        return global.pubsub.subscribe(...args);
      } else if (originalPubsub && typeof originalPubsub.subscribe === 'function') {
        console.warn(`[pubsub] Using fallback subscribe implementation`);
        return originalPubsub.subscribe(...args);
      }
      console.warn(`[pubsub] subscribe not available`);
      return undefined;
    };
    
    global.safeOn = global.safeSubscribe;
    
    global.safeOff = function(...args) {
      if (global.pubsub && typeof global.pubsub.off === 'function') {
        return global.pubsub.off(...args);
      } else if (originalPubsub && typeof originalPubsub.off === 'function') {
        console.warn(`[pubsub] Using fallback off implementation`);
        return originalPubsub.off(...args);
      }
      console.warn(`[pubsub] off not available`);
      return undefined;
    };
    
    console.log('[pubsub] Global pubsub system initialized');
  }
})(window);

/**
 * Main application entry point
 * This file loads all required modules and initializes the application
 */

// Import safety utilities early to ensure they're available
import './utils/safe-style-utils';
import './utils/addEventListener';
import './utils/event-utils';

// Add essential CSS for fixing black screen
// This must be done before any components are rendered
const addEssentialCSS = () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Ensure body and app container are visible */
    body, html {
      background-color: #000000;
      display: block !important;
      visibility: visible !important;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: auto;
    }
    
    /* Ensure main app containers are visible */
    .authed-section,
    .authed-section__main-content,
    #app,
    .app,
    .app-container,
    .main-content__panel-container,
    #react-panels,
    .react-panel,
    .feature-panel,
    side-panel,
    .side-panel,
    app-navigation,
    .app-navigation {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      min-height: 10px;
    }
    
    /* Force panels to be visible */
    [class*="panel"] {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    
    /* OSRS style font */
    @font-face {
      font-family: 'RuneScape';
      src: url('/fonts/RuneScape-Chat-07.ttf') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
  `;
  document.head.appendChild(style);
  console.log('[styles] Essential CSS styles loaded');
};

// Execute immediately to prevent black screen
addEssentialCSS();

// Import all feature modules to ensure they're loaded
import './features';

// Import React setup to initialize React components
import './react-setup';

// Import App component for feature integration
import "./App.js";

// Import collection log bridge first to make sure it's available
import "./features/collection-log/collection-log-bridge.js";

// Import all custom features
import "./features/index.js";

import "./appearance.js";
import "./men-homepage/men-homepage.js";
import "./wrap-routes/wrap-routes.js";
import "./data/api.js";
import "./data/group-data.js";
import "./search-element/search-element.js";
import "./inventory-item/inventory-item.js";
import "./inventory-pager/inventory-pager.js";
import "./app-navigation/app-navigation.js";
import "./items-page/items-page.js";
import "./app-route/app-route.js";
import "./map-page/map-page.js";
import "./side-panel/side-panel.js";
import "./player-panel/player-panel.js";
import "./player-stats/player-stats.js";
import "./player-inventory/player-inventory.js";
import "./player-skills/player-skills.js";
import "./skill-box/skill-box.js";
import "./player-equipment/player-equipment.js";
import "./xp-dropper/xp-dropper.js";
import "./rs-tooltip/rs-tooltip.js";
import "./item-box/item-box.js";
import "./total-level-box/total-level-box.js";
import "./player-quests/player-quests.js";
import "./create-group/create-group.js";
import "./men-link/men-link.js";
import "./setup-instructions/setup-instructions.js";
import "./app-initializer/app-initializer.js";
import "./group-settings/group-settings.js";
import "./member-name-input/member-name-input.js";
import "./men-input/men-input.js";
import "./canvas-map/canvas-map.js";
import "./router.js";

// Do not import the collection-log-page here to avoid duplicate registration
// import "./collection-log/collection-log.js";
// import "./collection-log-page/collection-log-page.js";
import "./collection-log-tab/collection-log-tab.js";
import "./collection-log-item/collection-log-item.js";

// React feature modules - import only those that exist
import "./features/collection-log/index.js";
import "./features/valuable-drops/index.js";
import "./features/slayer-tasks/index.js";
import "./features/boss-strategy/index.js";
import "./features/boss-strategy/BossStrategyPanel.jsx";
import "./features/valuable-drops/ValuableDrops.jsx";

// DO NOT import non-existent React components or feature modules
// This will prevent build errors

// Let window know custom components module is loaded
console.log("Custom components module loaded");

// Use native addEventListener for DOMContentLoaded and load events
// Do NOT import or use addSafeEventListener here for DOM events!
document.addEventListener('DOMContentLoaded', () => {
  // Initialize wiki service if available
  const wikiService = window.wikiService;
  if (wikiService) {
    wikiService.initialize();
    console.log('Wiki service initialized');
  }

  // Initialize collection log integration
  document.addEventListener('load', () => {
    // Force app to be visible after load
    setTimeout(() => {
      const app = document.getElementById('app');
      if (app) {
        app.style.display = 'block';
        app.style.visibility = 'visible';
        console.log('App visibility forced after load');
      }
      
      // Force main content to be visible 
      const mainContent = document.querySelector('.authed-section__main-content');
      if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
      }
      
      // Apply essential styles to all panels
      const reactPanels = document.getElementById('react-panels');
      if (reactPanels) {
        reactPanels.style.display = 'block';
        reactPanels.style.visibility = 'visible';
      }
    }, 500);
  });

  console.log("All feature modules loaded");
});
