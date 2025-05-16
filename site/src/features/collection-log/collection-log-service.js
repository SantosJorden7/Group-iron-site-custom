/**
 * Collection Log Service
 * Handles integration between plugin-provided collection log data and additional sources
 * Maintains plugin-first approach while providing fallbacks
 */

import { DataSourceTypes, DataSourceBadges } from '../data-sync/multi-source-utility';

class CollectionLogService {
  constructor() {
    this.cachedWomItems = new Map();
    this.cachedWikiItems = new Map();
    this.itemSourceMap = new Map(); // Maps itemId to data source and timestamp
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    this.logData = null; // Store the latest log data
  }

  /**
   * Initialize the service with external dependencies
   * @param {Object} wikiService - Wiki service for item info
   * @param {Object} wiseOldManService - WOM service for achievements
   */
  initialize(wikiService, wiseOldManService) {
    this.wikiService = wikiService;
    this.wiseOldManService = wiseOldManService;
  }

  /**
   * Get item source information
   * @param {number} itemId - The collection log item ID
   * @returns {Object} - Source info with type and timestamp
   */
  getItemSource(itemId) {
    return this.itemSourceMap.get(itemId) || { 
      source: null,
      timestamp: null,
      badge: null
    };
  }

  /**
   * Set item source information
   * @param {number} itemId - The collection log item ID
   * @param {string} source - The data source type (plugin, wiseoldman, wiki)
   */
  setItemSource(itemId, source) {
    this.itemSourceMap.set(itemId, {
      source,
      timestamp: new Date(),
      badge: DataSourceBadges[source]
    });
  }

  /**
   * Check if a player has an item in their collection log
   * Preserves plugin-first approach, with fallbacks to WOM and Wiki
   * 
   * @param {string} playerName - Player name
   * @param {number} itemId - Item ID to check
   * @param {Object} collectionLog - Original collection log data
   * @returns {Object} - { unlocked: boolean, quantity: number, source: string }
   */
  async isItemUnlocked(playerName, itemId, collectionLog) {
    // 1. Check plugin data first (preserve original behavior)
    const pluginUnlocked = collectionLog.isItemUnlocked(playerName, itemId);
    const pluginQuantity = collectionLog.unlockedItemCount(playerName, itemId);
    
    if (pluginUnlocked) {
      this.setItemSource(itemId, DataSourceTypes.PLUGIN);
      return { 
        unlocked: true, 
        quantity: pluginQuantity,
        source: DataSourceTypes.PLUGIN,
        badge: DataSourceBadges[DataSourceTypes.PLUGIN]
      };
    }

    // 2. Check Wise Old Man data if available
    if (this.wiseOldManService) {
      const womData = await this.getWomItemStatus(playerName, itemId);
      if (womData && womData.unlocked) {
        this.setItemSource(itemId, DataSourceTypes.WISE_OLD_MAN);
        return { 
          unlocked: true, 
          quantity: womData.quantity || 1,
          source: DataSourceTypes.WISE_OLD_MAN,
          badge: DataSourceBadges[DataSourceTypes.WISE_OLD_MAN]
        };
      }
    }

    // 3. Fall back to Wiki for metadata only
    if (this.wikiService) {
      const wikiData = await this.getWikiItemInfo(itemId);
      if (wikiData) {
        this.setItemSource(itemId, DataSourceTypes.WIKI);
        // Wiki can't tell us if it's unlocked, so we return false
        // but we include the wiki data for enrichment
        return { 
          unlocked: false, 
          quantity: 0,
          wikiData, // Include wiki data for display enrichment
          source: DataSourceTypes.WIKI,
          badge: DataSourceBadges[DataSourceTypes.WIKI]
        };
      }
    }

    // Not found in any source
    return {
      unlocked: false,
      quantity: 0,
      source: null
    };
  }

  /**
   * Get item information from Wise Old Man
   * @param {string} playerName - Player name
   * @param {number} itemId - Item ID to check
   * @returns {Promise<Object>} - WOM item data
   */
  async getWomItemStatus(playerName, itemId) {
    try {
      // Check cache first
      const cacheKey = `${playerName}-${itemId}`;
      const cached = this.cachedWomItems.get(cacheKey);
      
      if (cached && 
          (Date.now() - cached.timestamp) < this.cacheExpiry) {
        return cached.data;
      }
      
      // If not in cache or expired, fetch from WOM
      if (this.wiseOldManService) {
        const collectionData = await this.wiseOldManService
          .getPlayerCollectionLog(playerName);
          
        if (collectionData) {
          // Find the item in the collection
          const item = collectionData.items?.find(i => i.id === itemId);
          
          const result = item ? {
            unlocked: true,
            quantity: item.quantity || 1,
            obtained: item.obtained || true,
            source: DataSourceTypes.WISE_OLD_MAN
          } : null;
          
          // Cache the result
          this.cachedWomItems.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          return result;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting WOM item status:', error);
      return null; 
    }
  }
  
  /**
   * Get item information from the OSRS Wiki
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} - Wiki item data
   */
  async getWikiItemInfo(itemId) {
    try {
      // Check cache first
      const cached = this.cachedWikiItems.get(itemId);
      
      if (cached && 
          (Date.now() - cached.timestamp) < this.cacheExpiry) {
        return cached.data;
      }
      
      // If not in cache or expired, fetch from Wiki
      if (this.wikiService) {
        const itemInfo = await this.wikiService.getItemInfo(itemId);
        
        if (itemInfo) {
          // Cache the result
          this.cachedWikiItems.set(itemId, {
            data: itemInfo,
            timestamp: Date.now()
          });
          
          return itemInfo;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting Wiki item info:', error);
      return null;
    }
  }
  
  /**
   * Update the collection log data
   * @param {Object} logData - The new collection log data
   */
  updateLogData(logData) {
    if (!logData) return;
    
    try {
      this.logData = {
        ...this.logData,
        ...logData,
        lastUpdated: new Date()
      };
      
      // Notify subscribers of the update
      if (window.pubsub) {
        window.safePublish('collection-log-data-updated', this.logData);
      }
      
      console.log('Collection log data updated');
    } catch (err) {
      console.error('Error updating collection log data:', err);
    }
  }
  
  /**
   * Get merged data from all sources
   * @returns {Promise<Object>} - Combined collection log data 
   */
  async getMergedData() {
    try {
      let result = {
        items: [],
        categories: [],
        lastUpdated: null,
        sources: {}
      };
      
      // 1. Use plugin data as base if available
      if (this.logData) {
        result = {
          ...result,
          ...this.logData,
          sources: {
            ...result.sources,
            plugin: {
              name: 'RuneLite Plugin',
              timestamp: this.logData.lastUpdated,
              badge: DataSourceBadges[DataSourceTypes.PLUGIN]
            }
          }
        };
      }
      
      // 2. Add WOM data if available
      if (this.wiseOldManService) {
        try {
          const womData = await this.wiseOldManService.getCollectionLog();
          if (womData) {
            // Merge items
            if (womData.items && womData.items.length > 0) {
              // Add new items not in the plugin data
              const existingItemIds = new Set(result.items.map(i => i.id));
              const newItems = womData.items.filter(item => !existingItemIds.has(item.id));
              
              result.items = [
                ...result.items,
                ...newItems.map(item => ({
                  ...item,
                  source: DataSourceTypes.WISE_OLD_MAN,
                  badge: DataSourceBadges[DataSourceTypes.WISE_OLD_MAN]
                }))
              ];
              
              result.sources.wiseOldMan = {
                name: 'Wise Old Man',
                timestamp: new Date(),
                badge: DataSourceBadges[DataSourceTypes.WISE_OLD_MAN],
                itemCount: newItems.length
              };
            }
          }
        } catch (womErr) {
          console.warn('Error getting WOM collection data:', womErr);
        }
      }
      
      // 3. Add Wiki data for enrichment
      if (this.wikiService) {
        try {
          // Enrich items with wiki data
          const enrichedItems = await Promise.all(
            result.items.map(async item => {
              const wikiData = await this.getWikiItemInfo(item.id);
              return wikiData ? {
                ...item,
                wikiData,
                enriched: true
              } : item;
            })
          );
          
          result.items = enrichedItems;
          result.sources.wiki = {
            name: 'OSRS Wiki',
            timestamp: new Date(),
            badge: DataSourceBadges[DataSourceTypes.WIKI]
          };
        } catch (wikiErr) {
          console.warn('Error enriching with Wiki data:', wikiErr);
        }
      }
      
      return result;
    } catch (err) {
      console.error('Error getting merged collection log data:', err);
      return { 
        items: [], 
        categories: [],
        error: err.message
      };
    }
  }
}

// Create a singleton instance
const collectionLogService = new CollectionLogService();

// Export the singleton instance as default
export default collectionLogService;

// Export named methods to match what's imported in collection-log-bridge.js
export const initialize = (...args) => collectionLogService.initialize(...args);
export const updateLogData = (...args) => collectionLogService.updateLogData(...args);
export const getMergedData = (...args) => collectionLogService.getMergedData(...args);
