/**
 * Collection Log Refresher
 * 
 * This script handles automatic refreshing of collection log data
 * by connecting the client's React-based features with the site's original implementation.
 */

class CollectionLogRefresher {
  constructor() {
    this.refreshInterval = 5 * 60 * 1000; // 5 minutes
    this.intervalId = null;
    this.isInitialized = false;
    this.lastRefresh = null;
  }

  /**
   * Initialize the refresher with dependencies
   * @param {Object} syncContext - SyncContext for coordinating updates
   * @param {Object} wikiService - WikiService instance
   * @param {Object} wiseOldManService - WiseOldManService instance
   */
  initialize(syncContext, wikiService, wiseOldManService) {
    if (this.isInitialized) return;
    
    this.syncContext = syncContext;
    this.wikiService = wikiService;
    this.wiseOldManService = wiseOldManService;
    
    // Setup event listeners for collection log integration
    this.setupEventListeners();
    
    // Start automatic refresh cycle
    this.startRefreshCycle();
    
    this.isInitialized = true;
    console.log('Collection Log Refresher initialized');
  }

  /**
   * Setup event listeners for collection log events
   */
  setupEventListeners() {
    // Listen for plugin data changes
    window.addEventListener('runelite:collection-log-updated', this.handlePluginUpdate.bind(this));
    
    // Listen for manual refresh requests
    window.addEventListener('collection-log-refresh', this.refresh.bind(this));
    
    // Listen for collection log mount/unmount
    document.addEventListener('collection-log-mounted', () => {
      console.log('Collection Log UI mounted');
      this.patchCollectionLogDisplay();
    });
    
    // Hook into site's collection log select player event
    window.addEventListener('collection-log-select-player', (event) => {
      const playerName = event.detail?.playerName;
      if (playerName && this.wiseOldManService) {
        // Pre-fetch player data when player is selected
        this.wiseOldManService.getPlayerAchievements(playerName)
          .catch(err => console.error('Error pre-fetching player achievements:', err));
      }
    });
  }

  /**
   * Handle plugin update events
   * @param {Event} event - Plugin update event
   */
  handlePluginUpdate(event) {
    console.log('Plugin collection log data updated');
    this.lastRefresh = new Date();
    
    // Force refresh the display with new plugin data
    this.patchCollectionLogDisplay();
  }

  /**
   * Start the automatic refresh cycle
   */
  startRefreshCycle() {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Set up new interval
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.refreshInterval);
  }

  /**
   * Stop the automatic refresh cycle
   */
  stopRefreshCycle() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Refresh collection log data
   */
  refresh() {
    // Skip if a refresh is already in progress
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    console.log('Refreshing collection log data...');
    
    Promise.all([
      // Trigger sync context refresh if available
      this.syncContext ? this.syncContext.syncCollectionLog() : Promise.resolve(),
      
      // Additional collection log specific refreshes can be added here
    ])
    .then(() => {
      this.lastRefresh = new Date();
      this.patchCollectionLogDisplay();
      console.log('Collection log data refreshed successfully');
    })
    .catch(error => {
      console.error('Error refreshing collection log:', error);
    })
    .finally(() => {
      this.isRefreshing = false;
    });
  }

  /**
   * Patch the collection log display with enhanced data
   */
  patchCollectionLogDisplay() {
    // Find all collection log items in the DOM
    const itemElements = document.querySelectorAll('collection-log-item');
    
    if (itemElements.length === 0) {
      console.log('No collection log items found to enhance');
      return;
    }
    
    // Apply our enhancements to each item
    itemElements.forEach(element => {
      this.enhanceCollectionLogItem(element);
    });
  }

  /**
   * Enhance a collection log item with multi-source data
   * @param {HTMLElement} element - The collection log item element
   */
  enhanceCollectionLogItem(element) {
    // Extract data from element
    const itemId = parseInt(element.getAttribute('item-id'), 10);
    const playerName = element.getAttribute('player-name');
    
    if (!itemId || !playerName) return;
    
    // Get original plugin state
    const isUnlockedByPlugin = element.hasAttribute('unlocked') && 
      element.getAttribute('unlocked') === 'true';
    
    // If already unlocked by plugin, no need to enhance
    if (isUnlockedByPlugin) return;
    
    // Check WOM and Wiki services for data
    this.fetchEnhancedItemData(itemId, playerName)
      .then(enhancedData => {
        if (!enhancedData) return;
        
        // Apply enhanced data to the element
        this.applyEnhancedData(element, enhancedData);
      })
      .catch(err => {
        console.error(`Error enhancing item ${itemId} for ${playerName}:`, err);
      });
  }

  /**
   * Fetch enhanced item data from multiple sources
   * @param {number} itemId - Item ID
   * @param {string} playerName - Player name
   * @returns {Promise<Object>} - Enhanced item data
   */
  async fetchEnhancedItemData(itemId, playerName) {
    // Get data from Wise Old Man if available
    let womData = null;
    if (this.wiseOldManService) {
      try {
        const achievements = await this.wiseOldManService.getPlayerAchievements(playerName);
        if (achievements && achievements.length > 0) {
          // Check if any achievement indicates this item is unlocked
          // This is a simplified example; real implementation would map achievements to items
          womData = this.inferItemUnlockFromAchievements(itemId, achievements);
        }
      } catch (err) {
        console.warn('Error fetching WOM data:', err);
      }
    }
    
    // Get data from Wiki if available
    let wikiData = null;
    if (this.wikiService) {
      try {
        const itemName = this.getItemNameById(itemId);
        if (itemName) {
          wikiData = await this.wikiService.getItemInfo(itemName);
        }
      } catch (err) {
        console.warn('Error fetching Wiki data:', err);
      }
    }
    
    // No enhanced data available
    if (!womData && !wikiData) return null;
    
    // Return the enhanced data
    return {
      womData,
      wikiData,
      // Source is determined by which data is available
      // Priority: WOM > Wiki
      source: womData ? 'wiseoldman' : wikiData ? 'wiki' : null
    };
  }

  /**
   * Apply enhanced data to a collection log item element
   * @param {HTMLElement} element - Collection log item element
   * @param {Object} enhancedData - Enhanced item data
   */
  applyEnhancedData(element, enhancedData) {
    const { womData, wikiData, source } = enhancedData;
    const itemContainer = element.querySelector('.item');
    if (!itemContainer) return;
    
    // Set data source badge
    const badgeElement = document.createElement('div');
    badgeElement.className = `collection-log-badge collection-log-badge-${source}`;
    
    if (source === 'wiseoldman') {
      badgeElement.textContent = 'W';
      badgeElement.title = 'Wise Old Man Data';
      badgeElement.style.backgroundColor = 'var(--info)';
      
      // If WOM data indicates the item is unlocked, mark it as such
      if (womData && womData.unlocked) {
        itemContainer.classList.add('collection-log__item-unlocked');
        itemContainer.classList.add('collection-log__item-unlocked-wom');
        
        // Update quantity if available
        if (womData.quantity > 0) {
          const quantityElement = document.createElement('div');
          quantityElement.className = 'quantity';
          quantityElement.textContent = womData.quantity;
          itemContainer.appendChild(quantityElement);
        }
      }
    } else if (source === 'wiki') {
      badgeElement.textContent = 'K';
      badgeElement.title = 'Wiki Data';
      badgeElement.style.backgroundColor = 'var(--warning)';
      
      // Add wiki-enriched class for styling
      itemContainer.classList.add('collection-log__item-wiki-enriched');
      
      // Store wiki data on the element for tooltips
      if (wikiData) {
        element.dataset.wikiData = JSON.stringify({
          name: wikiData.title || '',
          description: wikiData.extract || '',
          thumbnail: wikiData.thumbnail || ''
        });
        
        // Add click handler for wiki data if not already added
        if (!element._hasWikiHandler) {
          element._hasWikiHandler = true;
          element.addEventListener('click', this.handleWikiTooltip.bind(this));
        }
      }
    }
    
    // Add badge to the container
    itemContainer.style.position = 'relative';
    itemContainer.appendChild(badgeElement);
  }

  /**
   * Handle click event to show wiki tooltip
   * @param {Event} event - Click event
   */
  handleWikiTooltip(event) {
    const element = event.currentTarget;
    if (!element.dataset.wikiData) return;
    
    try {
      const wikiData = JSON.parse(element.dataset.wikiData);
      this.showWikiTooltip(event, wikiData);
    } catch (err) {
      console.error('Error showing wiki tooltip:', err);
    }
  }

  /**
   * Show wiki tooltip with item information
   * @param {Event} event - Click event
   * @param {Object} wikiData - Wiki data
   */
  showWikiTooltip(event, wikiData) {
    // Remove any existing tooltips
    const existingTooltip = document.querySelector('.wiki-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'wiki-tooltip';
    
    // Set tooltip content
    let tooltipContent = `<h3>${wikiData.name}</h3>`;
    
    if (wikiData.thumbnail) {
      tooltipContent += `<img src="${wikiData.thumbnail}" alt="${wikiData.name}" class="wiki-tooltip-img" />`;
    }
    
    if (wikiData.description) {
      tooltipContent += `<p>${wikiData.description}</p>`;
    }
    
    tooltip.innerHTML = tooltipContent;
    
    // Position the tooltip
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    
    // Add tooltip to the body
    document.body.appendChild(tooltip);
    
    // Remove on click outside
    setTimeout(() => {
      const clickOutside = (e) => {
        if (!tooltip.contains(e.target) && e.target !== event.target) {
          tooltip.remove();
          document.removeEventListener('click', clickOutside);
        }
      };
      
      document.addEventListener('click', clickOutside);
    }, 100);
  }

  /**
   * Infer if an item is unlocked based on achievements
   * @param {number} itemId - Item ID
   * @param {Array} achievements - Player achievements
   * @returns {Object|null} - Item unlock information or null
   */
  inferItemUnlockFromAchievements(itemId, achievements) {
    // This is a map of known collection log items that can be inferred from achievements
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
      
      // General pet achievements
      13321: { name: 'Pet' }, // Olmlet
      21748: { name: 'Lilzik' }, // Lil' Zik
      // Add more mappings as needed
    };
    
    const mapping = knownMappings[itemId];
    if (!mapping) return null;
    
    // Check for pet achievements
    if (mapping.name) {
      const petAchievement = achievements.find(a => 
        a.name && a.name.toLowerCase().includes(mapping.name.toLowerCase()) && a.threshold === 1);
      
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
   * Get item name by ID
   * @param {number} itemId - Item ID
   * @returns {string|null} - Item name or null
   */
  getItemNameById(itemId) {
    // This would ideally come from a database or mapping file
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
      13321: 'Olmlet',
      21748: 'Lilzik',
      // Add more mappings as needed
    };
    
    return itemMappings[itemId] || null;
  }
}

// Create singleton instance
const collectionLogRefresher = new CollectionLogRefresher();
export default collectionLogRefresher;
