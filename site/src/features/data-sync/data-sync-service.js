/**
 * Data Synchronization Service
 * 
 * Polls and consolidates player data from multiple sources:
 * 1. RuneLite plugin (primary source)
 * 2. OSRS Wiki (supplementary information)
 */

import wikiService from '../wiki-integration/wiki-service';
import { API_BASE_URL } from '../../config';
import groupChallengesService from '../group-challenges/group-challenges-service';
import { processPluginDrop, isItemValuable } from '../valuable-drops/valuable-drops-service';
import { store } from '../../store/store.js';
import { addNotification } from '../../store/actions/notificationActions.js';

/**
 * Service for synchronizing and consolidating player data from multiple sources
 */
class DataSyncService {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncData = new Map(); // Map of player name to last sync data
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
    this.wikiCache = new Map(); // Cache for wiki data
    this.previousPlayerData = new Map(); // Previous player data for change detection
    this.valuableDropThreshold = 50000; // Minimum value to consider an item as valuable
    this.initialized = false;
  }

  /**
   * Initialize the data sync service
   * Sets up event listeners and initial state
   */
  initialize() {
    if (this.initialized) return;
    
    console.log('Initializing data sync service');
    
    // Setup event listeners for data updates
    if (typeof window !== 'undefined') {
      try {
        // Listen for group data updates only if pubsub.on is a function
        if (window.pubsub && typeof window.pubsub.on === 'function') {
          window.pubsub.on('group-data-updated', () => {
            console.log('Group data updated, refreshing sync data');
          });
        } else {
          console.warn('window.pubsub.on is not available or not a function');
        }
        // Set initialized flag
        this.initialized = true;
        console.log('Data sync service initialized successfully');
      } catch (error) {
        console.error('Error initializing data sync service:', error);
      }
    }
  }

  /**
   * Check if a sync is currently in progress
   * @returns {boolean} - True if sync is in progress
   */
  isSyncInProgress() {
    return this.syncInProgress;
  }

  /**
   * Check if data for a player is currently cached and valid
   * @param {string} playerName - Name of the player
   * @returns {boolean} - True if cached data is available and valid
   */
  hasCachedData(playerName) {
    if (!this.lastSyncData.has(playerName)) {
      return false;
    }

    const syncData = this.lastSyncData.get(playerName);
    const currentTime = new Date().getTime();
    return (currentTime - syncData.timestamp) < this.cacheTimeout;
  }

  /**
   * Get cached data for a player if available
   * @param {string} playerName - Name of the player
   * @returns {Object|null} - Cached data or null if not available
   */
  getCachedData(playerName) {
    if (!this.hasCachedData(playerName)) {
      return null;
    }
    
    return this.lastSyncData.get(playerName).data;
  }

  /**
   * Sync data for a specific player
   * @param {string} playerName - Name of the player
   * @param {boolean} forceRefresh - Force refresh even if cached data is available
   * @returns {Promise<Object>} - Synchronized player data
   */
  async syncPlayerData(playerName, forceRefresh = false) {
    // Check if we have valid cached data
    if (!forceRefresh && this.hasCachedData(playerName)) {
      return this.getCachedData(playerName);
    }
    
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }
    
    this.syncInProgress = true;
    
    try {
      // 1. Get primary data from RuneLite plugin API
      const primaryData = await this.fetchPrimaryData(playerName);
      
      // 2. Enrich data with wiki information if available
      const enrichedData = await this.enrichWithWikiData(primaryData);
      
      // 3. Process the data for challenge and milestone updates
      await this.processPlayerUpdates(playerName, enrichedData);
      
      // 4. Detect and process valuable drops
      await this.detectValuableDrops(playerName, enrichedData);
      
      // Store previous data for change detection in future syncs
      this.previousPlayerData.set(playerName, {...enrichedData});
      
      // Cache the result
      this.lastSyncData.set(playerName, {
        data: enrichedData,
        timestamp: new Date().getTime()
      });
      
      return enrichedData;
    } catch (error) {
      console.error(`Error syncing data for ${playerName}:`, error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Sync data for an entire group
   * @param {Array<string>} playerNames - Array of player names in the group
   * @param {boolean} forceRefresh - Force refresh even if cached data is available
   * @returns {Promise<Object>} - Synchronized group data
   */
  async syncGroupData(playerNames, forceRefresh = false) {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }
    
    this.syncInProgress = true;
    
    try {
      const groupData = {
        members: [],
        lastUpdated: new Date().toISOString()
      };
      
      // Process each player in parallel
      const memberPromises = playerNames.map(async (playerName) => {
        try {
          // Use cached data if available and not forcing refresh
          if (!forceRefresh && this.hasCachedData(playerName)) {
            return this.getCachedData(playerName);
          }
          
          // Otherwise fetch new data
          const primaryData = await this.fetchPrimaryData(playerName);
          const enrichedData = await this.enrichWithWikiData(primaryData);
          
          // Process the data for challenge and milestone updates
          await this.processPlayerUpdates(playerName, enrichedData);
          
          // Detect and process valuable drops
          await this.detectValuableDrops(playerName, enrichedData);
          
          // Store previous data for change detection in future syncs
          this.previousPlayerData.set(playerName, {...enrichedData});
          
          // Cache the result
          this.lastSyncData.set(playerName, {
            data: enrichedData,
            timestamp: new Date().getTime()
          });
          
          return enrichedData;
        } catch (error) {
          console.error(`Error syncing data for group member ${playerName}:`, error);
          // Return partial data if available, otherwise null
          return this.hasCachedData(playerName) 
            ? this.getCachedData(playerName) 
            : { playerName, error: error.message, partial: true };
        }
      });
      
      groupData.members = await Promise.all(memberPromises);
      
      return groupData;
    } catch (error) {
      console.error('Error syncing group data:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Fetch primary data from RuneLite plugin API
   * @param {string} playerName - Name of the player
   * @returns {Promise<Object>} - Player data from primary source
   */
  async fetchPrimaryData(playerName) {
    try {
      const response = await fetch(`${API_BASE_URL}/player/${playerName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player data: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching primary data for ${playerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Enrich player data with information from OSRS Wiki
   * @param {Object} playerData - Player data from primary source
   * @returns {Promise<Object>} - Enriched player data
   */
  async enrichWithWikiData(playerData) {
    if (!playerData || !playerData.equipment) {
      return playerData;
    }
    
    const enrichedData = { ...playerData };
    
    try {
      // Process equipped items
      if (enrichedData.equipment && enrichedData.equipment.items) {
        const items = enrichedData.equipment.items;
        
        // Process each item in parallel
        const itemPromises = Object.entries(items).map(async ([slot, item]) => {
          if (item && item.id) {
            // Check if we have cached data for this item
            if (this.wikiCache.has(item.id)) {
              items[slot].wikiData = this.wikiCache.get(item.id);
            } else {
              // Fetch data from wiki service
              try {
                const wikiData = await wikiService.getItemData(item.id);
                if (wikiData) {
                  items[slot].wikiData = wikiData;
                  this.wikiCache.set(item.id, wikiData);
                }
              } catch (error) {
                console.warn(`Failed to fetch wiki data for item ${item.id}:`, error);
              }
            }
          }
          return [slot, items[slot]];
        });
        
        const processedItems = await Promise.all(itemPromises);
        enrichedData.equipment.items = Object.fromEntries(processedItems);
      }
      
      return enrichedData;
    } catch (error) {
      console.error('Error enriching data with wiki information:', error);
      return playerData; // Return original data if enrichment fails
    }
  }
  
  /**
   * Process player data updates for challenges and milestones
   * @param {string} playerName - Name of the player
   * @param {Object} playerData - Updated player data
   */
  async processPlayerUpdates(playerName, playerData) {
    if (!playerName || !playerData) return;
    
    try {
      // Auto-update challenges based on player data
      const updatedChallenges = await groupChallengesService.autoUpdateChallengeProgress(
        playerData,
        playerName
      );
      
      // If challenges were updated, show a notification
      if (updatedChallenges && updatedChallenges.length > 0) {
        store.dispatch(
          addNotification({
            id: `challenge-update-${Date.now()}`,
            type: 'info',
            title: 'Challenge Progress Updated',
            message: `Your progress on ${updatedChallenges.length} challenge(s) has been updated!`,
            autoDismiss: true
          })
        );
      }
      
      // Note: Milestone updates are handled server-side in authed.rs through auto_update_milestone_progress
      
    } catch (error) {
      console.error(`Error processing updates for ${playerName}:`, error);
    }
  }
  
  /**
   * Detect and process valuable drops by comparing current and previous player data
   * @param {string} playerName - Name of the player
   * @param {Object} currentData - Current player data
   */
  async detectValuableDrops(playerName, currentData) {
    // Skip if we don't have previous data for comparison
    if (!this.previousPlayerData.has(playerName) || !currentData) return;
    
    try {
      const previousData = this.previousPlayerData.get(playerName);
      
      // Check inventory for valuable items that weren't there before
      if (currentData.inventory && previousData.inventory) {
        const currentInventory = JSON.parse(currentData.inventory || '[]');
        const previousInventory = JSON.parse(previousData.inventory || '[]');
        
        // Find new items or items with increased quantity
        for (const currentItem of currentInventory) {
          if (!currentItem) continue;
          
          // Find same item in previous inventory
          const prevItem = previousInventory.find(item => item && item.id === currentItem.id);
          
          // If item is new or quantity increased
          if ((!prevItem || currentItem.quantity > prevItem.quantity) && 
              isItemValuable(currentItem, this.valuableDropThreshold)) {
            
            const newQuantity = prevItem ? (currentItem.quantity - prevItem.quantity) : currentItem.quantity;
            
            // Process as a valuable drop
            const dropData = {
              item_id: currentItem.id,
              item_name: currentItem.name,
              quantity: newQuantity,
              value: currentItem.price || 0,
              source: currentData.interacting || 'Unknown'
            };
            
            await processPluginDrop(
              {
                name: playerName,
                coordinates: JSON.parse(currentData.coordinates || '[0,0,0]'),
                interacting: currentData.interacting
              },
              dropData
            );
          }
        }
      }
    } catch (error) {
      console.error(`Error detecting valuable drops for ${playerName}:`, error);
    }
  }

  /**
   * Set the value threshold for valuable drops
   * @param {number} value - New threshold value in GP
   */
  setValuableDropThreshold(value) {
    if (typeof value === 'number' && value > 0) {
      this.valuableDropThreshold = value;
    }
  }
}

// Create a singleton instance
const dataSyncService = new DataSyncService();
dataSyncService.initialize();
export default dataSyncService;
