/**
 * Collection Log Bridge
 * 
 * This module connects the legacy WebComponents Collection Log with the React features implementation
 * Ensuring data flows correctly between both implementations
 */

import * as collectionLogService from './collection-log-service';
import addSafeEventListener from '../../utils/addEventListener';

// Initialize collection log event handlers
function setupCollectionLogEvents() {
  if (window.pubsub) {
    // Listen for log filter changes from React components
    window.safeSubscribe('log-filter-changed', (filterData) => {
      try {
        // Update any WebComponent UI if needed
        const collectionLogElement = document.querySelector('collection-log');
        if (collectionLogElement && typeof collectionLogElement.updateFilters === 'function') {
          collectionLogElement.updateFilters(filterData);
        }
      } catch (err) {
        console.warn('[CollectionLogBridge] Error handling log-filter-changed event:', err);
      }
    });
    
    // Listen for collection log data updates
    window.safeSubscribe('collection-log-updated', (logData) => {
      try {
        // Notify the service about updates
        collectionLogService.updateLogData(logData);
      } catch (err) {
        console.warn('[CollectionLogBridge] Error handling collection-log-updated event:', err);
      }
    });
    
    console.log('Collection Log Bridge event handlers registered');
  } else {
    console.warn('Collection Log Bridge: pubsub not available for event handling');
  }
}

// Initialize with global access for WebComponents
window.featureCollectionLog = {
  service: collectionLogService,
  
  // Method to initialize the service with sync context components
  initialize: (wikiService, wiseOldManService) => {
    try {
      collectionLogService.initialize(wikiService, wiseOldManService);
      setupCollectionLogEvents();
      console.log('Collection Log Bridge initialized with services');
    } catch (err) {
      console.error('Error initializing Collection Log Bridge:', err);
    }
  },
  
  // Method to get merged data
  getMergedData: async () => {
    try {
      return await collectionLogService.getMergedData();
    } catch (err) {
      console.error('Error getting merged collection log data:', err);
      return { items: [], categories: [], error: err.message };
    }
  },
  
  // Update the collection log state - can be called from WebComponents
  updateLogState: (logState) => {
    try {
      if (window.pubsub) {
        window.safePublish('log-filter-changed', logState);
        console.log('Collection log state updated via bridge');
      } else if (window.safePublish) {
        window.safePublish('log-filter-changed', logState);
        console.log('Collection log state updated via safe publish fallback');
      } else {
        console.warn('Could not update collection log state: pubsub not available');
      }
    } catch (err) {
      console.error('Error updating collection log state:', err);
    }
  },
  
  // Register a custom collection log element if it doesn't exist
  registerCustomElement: () => {
    try {
      // Check if collection-log element is already defined
      if (!customElements.get('collection-log')) {
        class CollectionLogElement extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.shadowRoot.innerHTML = `
              <style>
                :host {
                  display: block;
                  width: 100%;
                  height: 100%;
                  background: var(--panel-bg-color, #3B3023);
                  color: var(--text-color, #FFF);
                  font-family: 'RuneScape Bold', sans-serif;
                }
                .collection-log-container {
                  padding: 10px;
                }
                .log-title {
                  text-align: center;
                  margin-bottom: 10px;
                }
                .placeholder {
                  text-align: center;
                  padding: 20px;
                }
              </style>
              <div class="collection-log-container">
                <h2 class="log-title">Collection Log</h2>
                <div class="placeholder">
                  Loading collection log data...
                </div>
              </div>
            `;
          }
          
          connectedCallback() {
            console.log('Collection log element connected');
            
            // Notify using events that this element is ready
            if (window.pubsub) {
              window.safePublish('collection-log-element-connected', this);
            }
            
            // Initialize with data if available
            this.fetchData();
          }
          
          async fetchData() {
            try {
              const data = await window.featureCollectionLog.getMergedData();
              this.updateDisplay(data);
            } catch (err) {
              console.error('Error fetching collection log data:', err);
              this.showError(err.message);
            }
          }
          
          updateDisplay(data) {
            const container = this.shadowRoot.querySelector('.collection-log-container');
            if (container && data && data.items) {
              // Just a simple display for fallback
              container.innerHTML = `
                <h2 class="log-title">Collection Log</h2>
                <div class="log-content">
                  <p>Total items: ${data.items.length}</p>
                  <p>View details in the React panel</p>
                </div>
              `;
            }
          }
          
          showError(message) {
            const container = this.shadowRoot.querySelector('.collection-log-container');
            if (container) {
              container.innerHTML += `
                <div class="error">
                  Error loading collection log: ${message}
                </div>
              `;
            }
          }
          
          // API for WebComponents
          updateFilters(filterData) {
            console.log('Collection log filters updated:', filterData);
            // Implement filter updates if needed
          }
        }
        
        // Register the custom element
        customElements.define('collection-log', CollectionLogElement);
        console.log('Collection Log custom element registered');
      } else {
        console.log('Collection Log custom element already registered');
      }
    } catch (err) {
      console.error('Error registering collection log custom element:', err);
    }
  }
};

// Automatically register the custom element
window.featureCollectionLog.registerCustomElement();

// Export the same interface for React components
export default window.featureCollectionLog;
