/**
 * Event Bus Service
 * 
 * A simple pub/sub event bus implementation for cross-component communication
 * without direct dependencies between components.
 */

class EventBusService {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name to unsubscribe from
   * @param {Function} callback - Function to remove from listeners
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name to emit
   * @param {any} data - Data to pass to listeners
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event once - automatically unsubscribes after first emission
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is emitted
   */
  once(event, callback) {
    const onceCallback = (data) => {
      callback(data);
      this.off(event, onceCallback);
    };
    
    return this.on(event, onceCallback);
  }

  /**
   * Clear all listeners for an event or all events
   * @param {string} [event] - Optional event name, if not provided clears all events
   */
  clear(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// Create and export a singleton instance
export const EventBus = new EventBusService();

// Export common event names as constants for consistency
export const EVENTS = {
  DATA_SYNC_STARTED: 'dataSyncStarted',
  DATA_SYNC_COMPLETED: 'dataSyncCompleted',
  DATA_SYNC_FAILED: 'dataSyncFailed',
  GROUP_DATA_UPDATED: 'groupDataUpdated',
  PLAYER_DATA_UPDATED: 'playerDataUpdated',
  ROUTE_CHANGED: 'routeChanged',
  NOTIFICATION_ADDED: 'notificationAdded',
  NOTIFICATION_REMOVED: 'notificationRemoved',
  WIKI_DATA_REFRESHED: 'wikiDataRefreshed',
  COLLECTION_LOG_UPDATED: 'collectionLogUpdated',
  VALUABLE_DROP_ADDED: 'valuableDropAdded',
  SLAYER_TASK_COMPLETED: 'slayerTaskCompleted',
  BOSS_STRATEGY_UPDATED: 'bossStrategyUpdated',
  ACTIVITY_ADDED: 'activityAdded',
  MILESTONE_REACHED: 'milestoneReached',
  CHALLENGE_COMPLETED: 'challengeCompleted',
  CALENDAR_EVENT_ADDED: 'calendarEventAdded',
  CALENDAR_EVENT_UPDATED: 'calendarEventUpdated',
  CALENDAR_EVENT_REMOVED: 'calendarEventRemoved'
};
