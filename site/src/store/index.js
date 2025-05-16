/**
 * Central State Management
 * Provides a simple store mechanism for features to share state
 */

// Create a simple store with pub/sub pattern
class Store {
  constructor() {
    this.state = {
      features: {
        activitiesEnabled: true,
        bossStrategyEnabled: true,
        groupChallengesEnabled: true,
        groupMilestonesEnabled: true,
        sharedCalendarEnabled: true,
        slayerTasksEnabled: true,
        valuableDropsEnabled: true,
        dpsCalculatorEnabled: true,
        collectionLogEnabled: true
      },
      sync: {
        lastSyncTime: null,
        syncInProgress: false,
        syncError: null
      }
    };
    this.listeners = [];
  }

  // Get current state or a slice of it
  getState(path = null) {
    if (!path) return this.state;
    
    // Handle dot notation for nested paths
    return path.split('.').reduce((obj, key) => 
      (obj && obj[key] !== undefined) ? obj[key] : undefined, this.state);
  }
  
  // Update state
  setState(updater) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(this.state));
  }
  
  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Toggle feature flags
  toggleFeature(featureName, enabled) {
    if (this.state.features[featureName] !== undefined) {
      this.setState(state => ({
        ...state,
        features: {
          ...state.features,
          [featureName]: enabled
        }
      }));
    }
  }
  
  // Set sync state
  setSyncState(syncState) {
    this.setState(state => ({
      ...state,
      sync: {
        ...state.sync,
        ...syncState
      }
    }));
  }
}

// Create and export a singleton instance
const store = new Store();
export default store;
