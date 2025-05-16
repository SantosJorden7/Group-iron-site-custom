import React, { useEffect, useContext } from 'react';
import { useSync } from '../../contexts/SyncContext.js';
import { useGroup } from '../../contexts/GroupContext.js';
import collectionLogService from './collection-log-service';
import collectionLogRefresher from './collection-log-refresher';
import './collection-log-styles.css';

/**
 * Collection Log Integration Component
 * Connects the original site collection log with the client's multi-source data architecture
 * This component is invisible - it just handles initialization and integration
 */
const CollectionLogIntegration = () => {
  const { syncState, syncCollectionLog, wikiService, wiseOldManService } = useSync();
  const { group } = useGroup();
  
  // Initialize the collection log service with the dependencies
  useEffect(() => {
    if (wikiService && wiseOldManService) {
      collectionLogService.initialize(wikiService, wiseOldManService);
      
      // Initialize the refresher with sync capabilities
      collectionLogRefresher.initialize({
        syncCollectionLog,
        syncState
      }, wikiService, wiseOldManService);
      
      console.log('Collection Log Service initialized with multi-source capabilities');
    }
  }, [wikiService, wiseOldManService, syncCollectionLog, syncState]);

  // Add custom scripts to integrate with the collection log DOM
  useEffect(() => {
    // Only run this once
    const initializeCollectionLogPatching = () => {
      // Ensure the window.collectionLogIntegration object exists
      if (!window.collectionLogIntegration) {
        // Create a global integration object to be accessible to the site code
        window.collectionLogIntegration = {
          collectionLogService,
          collectionLogRefresher,
          refreshCollectionLog: () => collectionLogRefresher.refresh(),
          isInitialized: true
        };
        
        // Patch the existing collection log item component with the enhanced functionality
        patchCollectionLogItemComponent();
      }
    };
    
    initializeCollectionLogPatching();
  }, []);
  
  return null; // This is an invisible integration component
};

/**
 * Patches the site's collection-log-item web component
 * This avoids modifying the original code while adding multi-source support
 */
function patchCollectionLogItemComponent() {
  // Wait for custom elements to be defined
  const checkAndPatch = () => {
    // If the component was already defined, try to observe DOM changes
    if (customElements.get('collection-log-item')) {
      setupMutationObserver();
      return;
    }
    
    // Monitor when the component gets defined
    const originalDefine = customElements.define;
    customElements.define = function(name, constructor, options) {
      const result = originalDefine.call(this, name, constructor, options);
      
      if (name === 'collection-log-item') {
        console.log('Collection Log Item component defined, patching...');
        setupMutationObserver();
      }
      
      return result;
    };
  };
  
  // Use MutationObserver to detect when collection log items are added
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      const itemsAdded = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
          node.nodeName === 'COLLECTION-LOG-ITEM' || 
          (node.nodeType === 1 && node.querySelector('collection-log-item'))
        )
      );
      
      if (itemsAdded && window.collectionLogIntegration?.collectionLogRefresher) {
        window.collectionLogIntegration.collectionLogRefresher.patchCollectionLogDisplay();
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    console.log('Collection Log mutation observer established');
    
    // Dispatch an event to indicate the collection log is ready for integration
    const readyEvent = new CustomEvent('collection-log-integration-ready');
    window.dispatchEvent(readyEvent);
  }
  
  checkAndPatch();
}

export default CollectionLogIntegration;
