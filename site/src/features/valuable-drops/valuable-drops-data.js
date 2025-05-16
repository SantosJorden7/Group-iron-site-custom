/**
 * ValuableDropsData
 * 
 * Data management class for the valuable drops feature
 * Handles loading, caching, and organizing valuable drops data
 */

import ValuableDropsService from './valuable-drops-service';
import { EventBus } from '../../services/event-bus.js';

class ValuableDropsData {
  constructor() {
    this.drops = [];
    this.pagination = {
      totalCount: 0,
      offset: 0,
      limit: 25,
      hasMore: false
    };
    this.loading = false;
    this.error = null;
    this.filters = {
      memberName: '',
      minValue: '',
      sourceName: '',
      itemName: '',
      sort: 'timestamp',
      direction: 'desc'
    };
    
    // Subscribe to relevant events using the correct EventBus methods
    // The original code used 'subscribe' but the EventBus uses 'on'
    EventBus.on('player-data-updated', this.refreshData.bind(this));
    EventBus.on('custom-plugin-data-received', this.handlePluginData.bind(this));
  }
  
  /**
   * Load valuable drops with current filter settings
   * @param {boolean} append - Whether to append to existing data or replace
   * @returns {Promise<Array>} - Loaded drops
   */
  async loadDrops(append = false) {
    try {
      this.loading = true;
      this.error = null;
      
      // Prepare filter parameters for API call
      const filterParams = {
        ...this.filters,
        offset: append ? this.pagination.offset + this.pagination.limit : 0
      };
      
      // Filter out empty values
      Object.keys(filterParams).forEach(key => {
        if (!filterParams[key]) delete filterParams[key];
      });
      
      // Call API
      const response = await ValuableDropsService.getValuableDrops(filterParams);
      
      // Update internal state
      if (append) {
        this.drops = [...this.drops, ...response.drops];
      } else {
        this.drops = response.drops;
      }
      
      this.pagination = response.pagination;
      
      // Notify subscribers that data has loaded
      EventBus.publish('valuable-drops-loaded', this.drops);
      
      return this.drops;
    } catch (err) {
      console.error('Error loading valuable drops:', err);
      this.error = 'Failed to load valuable drops data. Please try again later.';
      EventBus.publish('valuable-drops-error', this.error);
      throw err;
    } finally {
      this.loading = false;
    }
  }
  
  /**
   * Add a new valuable drop
   * @param {Object} dropData - The drop data to add
   * @returns {Promise<Object>} - API response
   */
  async addDrop(dropData) {
    try {
      const response = await ValuableDropsService.addValuableDrop(dropData);
      // Refresh data to include the new drop
      await this.loadDrops();
      EventBus.publish('valuable-drop-added', response);
      return response;
    } catch (err) {
      console.error('Error adding valuable drop:', err);
      this.error = 'Failed to add the valuable drop. Please try again later.';
      EventBus.publish('valuable-drops-error', this.error);
      throw err;
    }
  }
  
  /**
   * Delete a valuable drop
   * @param {number} dropId - ID of the drop to delete
   * @returns {Promise<Object>} - API response
   */
  async deleteDrop(dropId) {
    try {
      const response = await ValuableDropsService.deleteValuableDrop(dropId);
      // Refresh data after deletion
      await this.loadDrops();
      EventBus.publish('valuable-drop-deleted', { dropId });
      return response;
    } catch (err) {
      console.error('Error deleting valuable drop:', err);
      this.error = 'Failed to delete the valuable drop. Please try again later.';
      EventBus.publish('valuable-drops-error', this.error);
      throw err;
    }
  }
  
  /**
   * Update filter settings
   * @param {Object} newFilters - Filter settings to apply
   */
  updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    // We don't load automatically to give UI a chance to debounce
  }
  
  /**
   * Reset filters to defaults
   */
  resetFilters() {
    this.filters = {
      memberName: '',
      minValue: '',
      sourceName: '',
      itemName: '',
      sort: 'timestamp',
      direction: 'desc'
    };
  }
  
  /**
   * Refresh data when player data is updated
   */
  async refreshData() {
    if (this.drops.length > 0) {
      await this.loadDrops();
    }
  }
  
  /**
   * Handle plugin data related to valuable drops
   * @param {Object} pluginData - Custom plugin data
   */
  async handlePluginData(pluginData) {
    // If the plugin sends a valuable drop, refresh our data
    if (pluginData?.type === 'valuable-drop') {
      await this.loadDrops();
    }
  }
  
  /**
   * Create a singleton instance
   * @returns {ValuableDropsData} - Singleton instance
   */
  static getInstance() {
    if (!ValuableDropsData.instance) {
      ValuableDropsData.instance = new ValuableDropsData();
    }
    return ValuableDropsData.instance;
  }
}

// Export as a singleton
export default ValuableDropsData.getInstance();
