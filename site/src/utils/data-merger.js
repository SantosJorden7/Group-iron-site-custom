/**
 * Data Merger Utility
 * Combines data from all three required sources in the specified priority order:
 * 1. RuneLite Plugin (group-ironmen-tracker)
 * 2. Wise Old Man API
 * 3. OSRS Wiki (via WikiService)
 */

import wikiService from '../services/WikiService';

/**
 * Merges data from multiple sources with proper priority
 * @param {Object} pluginData - Data from RuneLite Plugin (highest priority)
 * @param {Object} womData - Data from Wise Old Man API (medium priority)
 * @param {Object} wikiItemId - Item ID to fetch from OSRS Wiki (lowest priority)
 * @returns {Object} - Merged data object with source indicators
 */
export async function getMergedData(pluginData = null, womData = null, wikiItemId = null) {
  // Create the result object structure
  const result = {
    data: {},
    sources: {
      plugin: Boolean(pluginData),
      wiseOldMan: Boolean(womData),
      wiki: false
    },
    lastSync: {
      plugin: pluginData?.timestamp || null,
      wiseOldMan: womData?.lastUpdated || null,
      wiki: null
    }
  };

  // First priority: RuneLite Plugin data
  if (pluginData) {
    result.data = { ...result.data, ...pluginData };
  }

  // Second priority: Wise Old Man API data
  if (womData) {
    // Only apply WOM data for properties that don't exist in plugin data
    Object.keys(womData).forEach(key => {
      if (result.data[key] === undefined) {
        result.data[key] = womData[key];
      }
    });
  }

  // Third priority: OSRS Wiki data
  if (wikiItemId) {
    try {
      const wikiData = await wikiService.getItemData(wikiItemId);
      
      if (wikiData) {
        result.sources.wiki = true;
        result.lastSync.wiki = wikiService.lastFetched.get(wikiItemId) || null;
        
        // Only apply Wiki data for properties that don't exist in higher priority sources
        Object.keys(wikiData).forEach(key => {
          if (result.data[key] === undefined) {
            result.data[key] = wikiData[key];
          }
        });
        
        // Always apply the wiki source badge regardless of data merging
        result.data.wikiSource = true;
      }
    } catch (error) {
      console.error('Error fetching Wiki data for merging:', error);
    }
  }

  return result;
}

/**
 * Creates source badge indicators based on data sources
 * @param {Object} sources - Object indicating which sources provided data
 * @returns {Array} - Array of badge objects for UI rendering
 */
export function getSourceBadges(sources) {
  const badges = [];
  
  if (sources.plugin) {
    badges.push({ key: 'P', title: 'RuneLite Plugin', variant: 'primary' });
  }
  
  if (sources.wiseOldMan) {
    badges.push({ key: 'W', title: 'Wise Old Man API', variant: 'warning' });
  }
  
  if (sources.wiki) {
    badges.push({ key: 'K', title: 'OSRS Wiki', variant: 'info' });
  }
  
  return badges;
}

/**
 * Formats the last sync timestamp for display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} - Formatted time string
 */
export function formatLastSync(timestamp) {
  if (!timestamp) {
    return 'Never';
  }
  
  const date = new Date(timestamp);
  return date.toLocaleString();
}
