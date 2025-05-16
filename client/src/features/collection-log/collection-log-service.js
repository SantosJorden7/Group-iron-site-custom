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

    // No data from any source
    return { unlocked: false, quantity: 0, source: null, badge: null };
  }

  /**
   * Get collection log data from Wise Old Man API
   * @param {string} playerName - Player name
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} - Wise Old Man item status
   */
  async getWomItemStatus(playerName, itemId) {
    if (!this.wiseOldManService) return null;

    // Check cache first
    const cacheKey = `${playerName}_${itemId}`;
    if (this.cachedWomItems.has(cacheKey)) {
      const cachedData = this.cachedWomItems.get(cacheKey);
      if ((Date.now() - cachedData.timestamp) < this.cacheExpiry) {
        return cachedData.data;
      }
    }

    try {
      // Get achievements from Wise Old Man
      const achievements = await this.wiseOldManService.getPlayerAchievements(playerName);
      
      if (!achievements || achievements.length === 0) return null;
      
      // Check for collection log item unlocks
      // WOM doesn't track all items, but some can be inferred from achievements
      const itemStatus = this.inferItemUnlockFromAchievements(itemId, achievements);
      
      // Cache the result
      this.cachedWomItems.set(cacheKey, {
        data: itemStatus,
        timestamp: Date.now()
      });
      
      return itemStatus;
    } catch (error) {
      console.error(`Error getting WOM collection log info for ${playerName}, item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Try to infer if an item is unlocked based on WOM achievements
   * @param {number} itemId - Item ID
   * @param {Array} achievements - Wise Old Man achievements
   * @returns {Object|null} - Item status or null if can't be determined
   */
  inferItemUnlockFromAchievements(itemId, achievements) {
    // This is a map of known collection log items that can be inferred from achievements
    // Mapping between item IDs and achievement metrics/names
    const knownMappings = {
      // Boss drops
      // Abyssal Sire
      13262: { metric: 'abyssal_sire', name: 'Abyssal orphan' }, // Abyssal orphan pet
      13273: { metric: 'abyssal_sire', threshold: 500 }, // Jar of miasma
      
      // Hydra
      22746: { metric: 'alchemical_hydra', name: 'Ikkle hydra' }, // Ikkle hydra pet
      22731: { metric: 'alchemical_hydra', threshold: 500 }, // Jar of chemicals
      
      // Cerberus
      13247: { metric: 'cerberus', name: 'Hellpuppy' }, // Hellpuppy pet
      13245: { metric: 'cerberus', threshold: 500 }, // Jar of souls
      
      // Sarachnis
      23495: { metric: 'sarachnis', name: 'Sraracha' }, // Sraracha pet
      
      // Other rare drops can be added based on WOM's available metrics
    };
    
    const mapping = knownMappings[itemId];
    if (!mapping) return null;
    
    // Check for pet achievements
    if (mapping.name) {
      const petAchievement = achievements.find(a => 
        a.name.toLowerCase().includes(mapping.name.toLowerCase()) && a.threshold === 1);
      
      if (petAchievement && petAchievement.measure > 0) {
        return { unlocked: true, quantity: 1 };
      }
    }
    
    // Check for KC-based achievements (jars, etc)
    if (mapping.metric && mapping.threshold) {
      const kcAchievement = achievements.find(a => 
        a.metric === mapping.metric && a.threshold >= mapping.threshold);
      
      if (kcAchievement && kcAchievement.measure > mapping.threshold) {
        // This is just an inference - player likely has the jar if they have high KC
        return { unlocked: true, quantity: 1, inferred: true };
      }
    }
    
    return null;
  }

  /**
   * Get item information from the Wiki
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} - Wiki item info
   */
  async getWikiItemInfo(itemId) {
    if (!this.wikiService) return null;
    
    // Check cache first
    if (this.cachedWikiItems.has(itemId)) {
      const cachedData = this.cachedWikiItems.get(itemId);
      if ((Date.now() - cachedData.timestamp) < this.cacheExpiry) {
        return cachedData.data;
      }
    }

    try {
      // Convert item ID to item name (using a mapping or lookup)
      const itemName = await this.getItemNameFromId(itemId);
      
      if (!itemName) return null;
      
      // Get item info from wiki
      const itemInfo = await this.wikiService.getItemInfo(itemName);
      
      if (!itemInfo) return null;
      
      // Cache the result
      this.cachedWikiItems.set(itemId, {
        data: itemInfo,
        timestamp: Date.now()
      });
      
      return itemInfo;
    } catch (error) {
      console.error(`Error getting wiki info for item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Map item ID to item name
   * @param {number} itemId - Item ID
   * @returns {Promise<string>} - Item name
   */
  async getItemNameFromId(itemId) {
    // This would ideally come from a database or mapping file
    // For now, we'll use a simplified approach with common collection log items
    
    // This is just a small sample of mappings
    const itemMappings = {
      13262: 'Abyssal orphan',
      13273: 'Jar of miasma',
      22746: 'Ikkle hydra',
      22731: 'Jar of chemicals',
      13247: 'Hellpuppy',
      13245: 'Jar of souls',
      11815: 'Dragon warhammer',
      12073: 'Abyssal whip',
      11785: 'Armadyl crossbow',
      // Add more mappings as needed
    };
    
    return itemMappings[itemId] || null;
  }
}

// Create a singleton instance
const collectionLogService = new CollectionLogService();
export default collectionLogService;
