/**
 * Multi-Source Data Utility
 * Provides utilities for handling data from multiple sources with appropriate fallback logic
 */

/**
 * Data source types with priority order
 */
export const DataSourceTypes = {
  PLUGIN: 'plugin', // Highest priority
  WISE_OLD_MAN: 'wiseoldman', // Secondary priority
  WIKI: 'wiki' // Tertiary (enrichment) source
};

/**
 * Source identifier badges for UI display
 */
export const DataSourceBadges = {
  [DataSourceTypes.PLUGIN]: { text: 'P', variant: 'success', title: 'Plugin Data (Real-time)' },
  [DataSourceTypes.WISE_OLD_MAN]: { text: 'W', variant: 'info', title: 'Wise Old Man Data' },
  [DataSourceTypes.WIKI]: { text: 'K', variant: 'warning', title: 'Wiki Data' }
};

/**
 * Get the most reliable data based on priority
 * @param {Object} pluginData - Data from RuneLite plugin
 * @param {Object} womData - Data from Wise Old Man API
 * @param {Object} wikiData - Data from OSRS Wiki
 * @returns {Object} - The best available data and its source type
 */
export const getMergedData = (pluginData, womData, wikiData) => {
  if (pluginData && Object.keys(pluginData).length > 0) {
    return { 
      data: pluginData, 
      source: DataSourceTypes.PLUGIN,
      badge: DataSourceBadges[DataSourceTypes.PLUGIN] 
    };
  }
  
  if (womData && Object.keys(womData).length > 0) {
    return { 
      data: womData, 
      source: DataSourceTypes.WISE_OLD_MAN,
      badge: DataSourceBadges[DataSourceTypes.WISE_OLD_MAN] 
    };
  }
  
  if (wikiData && Object.keys(wikiData).length > 0) {
    return { 
      data: wikiData, 
      source: DataSourceTypes.WIKI,
      badge: DataSourceBadges[DataSourceTypes.WIKI] 
    };
  }
  
  return { data: null, source: null, badge: null };
};

/**
 * Determines the active data source for a specific data item
 * @param {Boolean} hasPluginData - Whether plugin data exists
 * @param {Boolean} hasWomData - Whether WOM data exists
 * @param {Boolean} hasWikiData - Whether Wiki data exists
 * @returns {String} - The source type to use
 */
export const getActiveDataSource = (hasPluginData, hasWomData, hasWikiData) => {
  if (hasPluginData) return DataSourceTypes.PLUGIN;
  if (hasWomData) return DataSourceTypes.WISE_OLD_MAN;
  if (hasWikiData) return DataSourceTypes.WIKI;
  return null;
};

/**
 * Format a timestamp for display
 * @param {Date|String} timestamp - The timestamp to format
 * @returns {String} - Formatted timestamp string
 */
export const formatLastUpdated = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Creates a data source status object for display
 * @param {Object} syncState - Current sync state from SyncContext
 * @param {Object} wikiState - Current wiki state from SyncContext
 * @param {Object} womState - Current WOM state (from modified SyncContext)
 * @returns {Object} - Data sources status
 */
export const getDataSourcesStatus = (syncState, wikiState, womState) => {
  return {
    plugin: {
      active: syncState?.lastSyncSuccess || false,
      lastUpdated: syncState?.lastSyncTime || null,
      error: syncState?.lastSyncError || null,
      badge: DataSourceBadges[DataSourceTypes.PLUGIN]
    },
    wiseOldMan: {
      active: womState?.lastSuccess || false,
      lastUpdated: womState?.lastUpdateTime || null,
      error: womState?.lastError || null,
      badge: DataSourceBadges[DataSourceTypes.WISE_OLD_MAN]
    },
    wiki: {
      active: wikiState?.connected || false,
      lastUpdated: wikiState?.lastUpdateTime || null,
      error: wikiState?.error || null,
      badge: DataSourceBadges[DataSourceTypes.WIKI]
    }
  };
};

/**
 * Generic data sources panel component for use across all features
 * Takes in source data and renders a consistent status panel
 * @param {React.Component} Component - React Component to render
 * @param {Object} props - Props to pass to the component
 */
export const DataSourcesStatusPanel = ({ sources }) => {
  return {
    // Data source panel implementation - will be shared across features
    // This is a placeholder that will be replaced with React components during
    // the actual integration of the panels.
  };
};
