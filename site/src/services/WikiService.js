/**
 * WikiService
 * Provides integration with the OSRS Wiki API
 * This service is the tertiary data source in the merged data integration model
 */

class WikiService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
    this.lastFetched = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Fetches item data from the OSRS Wiki
   * @param {string|number} itemId The item ID to fetch
   * @returns {Promise<Object>} Item data
   */
  async getItemData(itemId) {
    if (!itemId) return null;
    
    // Check cache first
    if (this.isCacheValid(itemId)) {
      return this.cache.get(itemId);
    }
    
    // Return existing promise if one is already in progress
    if (this.pendingRequests.has(itemId)) {
      return this.pendingRequests.get(itemId);
    }
    
    // Create a new promise for this request
    const requestPromise = this._fetchItemData(itemId);
    this.pendingRequests.set(itemId, requestPromise);
    
    try {
      const data = await requestPromise;
      this.pendingRequests.delete(itemId);
      return data;
    } catch (error) {
      this.pendingRequests.delete(itemId);
      throw error;
    }
  }
  
  /**
   * Internal method to fetch item data from the Wiki API
   * @private
   */
  async _fetchItemData(itemId) {
    try {
      console.log(`[WikiService] Fetching item data for: ${itemId}`);
      
      // In production, this would be a real API call to the OSRS Wiki
      // For now, we'll simulate a response
      const data = {
        id: itemId,
        name: `Item ${itemId}`,
        examine: 'An item from the OSRS Wiki.',
        price: Math.floor(Math.random() * 1000) + 1,
        members: true,
        tradeable: true,
        icon: `/api/wiki/icon/${itemId}`,
        source: 'OSRSWiki'
      };
      
      // Cache the result
      this.cache.set(itemId, data);
      this.lastFetched.set(itemId, Date.now());
      
      return data;
    } catch (error) {
      console.error('[WikiService] Error fetching item data:', error);
      return null;
    }
  }
  
  /**
   * Checks if the cached data for an item is still valid
   * @private
   */
  isCacheValid(itemId) {
    if (!this.cache.has(itemId) || !this.lastFetched.has(itemId)) {
      return false;
    }
    
    const fetchTime = this.lastFetched.get(itemId);
    return (Date.now() - fetchTime) < this.cacheDuration;
  }
  
  /**
   * Forces a refresh of the cached data for an item
   */
  async forceRefresh(itemId) {
    if (!itemId) return null;
    
    // Remove from cache
    this.cache.delete(itemId);
    this.lastFetched.delete(itemId);
    
    // Fetch fresh data
    return this.getItemData(itemId);
  }
  
  /**
   * Clears the entire cache
   */
  clearCache() {
    this.cache.clear();
    this.lastFetched.clear();
    console.log('[WikiService] Cache cleared');
  }
}

// Create a singleton instance
const wikiService = new WikiService();

export default wikiService;
