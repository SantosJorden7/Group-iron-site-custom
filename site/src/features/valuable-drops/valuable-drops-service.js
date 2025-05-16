/**
 * Valuable Drops Business Logic
 * Contains all the business logic for the Valuable Drops feature
 */
import * as valuableDropsApi from './valuable-drops-api';
import groupChallengesService from '../group-challenges/group-challenges-service';
import { store } from '../../store/store.js';
import { addNotification } from '../../store/actions/notificationActions.js';

/**
 * Format currency value (GP) with proper formatting
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount (e.g., "1.2M" for 1,200,000)
 */
const formatGp = (amount) => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  } else {
    return `${amount}`;
  }
};

/**
 * Process a drop from the plugin
 * @param {Object} dropData - Raw drop data from plugin
 * @returns {Object} - Processed drop data
 */
const processPluginDrop = (dropData) => {
  // Process the drop data from plugin format to our internal format
  return {
    itemId: dropData.itemId || 0,
    itemName: dropData.itemName || '',
    quantity: dropData.quantity || 1,
    value: dropData.value || 0,
    source: dropData.source || 'Unknown',
    member: dropData.member || 'Unknown',
    timestamp: dropData.timestamp || Date.now(),
    pluginSource: true
  };
};

/**
 * Check if an item is valuable based on threshold
 * @param {Object} item - Item to check
 * @param {number} threshold - Value threshold in GP
 * @returns {boolean} - True if item is valuable
 */
const isItemValuable = (item, threshold = 100000) => {
  return item && item.value >= threshold;
};

/**
 * Get color class based on value
 * @param {number} value - Item value in GP
 * @returns {string} - CSS class name for coloring
 */
const getValueColorClass = (value) => {
  if (value >= 10000000) {
    return 'text-high-value';
  } else if (value >= 1000000) {
    return 'text-medium-value';
  } else if (value >= 100000) {
    return 'text-low-value';
  }
  return '';
};

/**
 * Get valuable drops with optional filtering and sorting
 * @param {Object} filters - Optional filters to apply
 * @param {Object} sorting - Optional sorting configuration
 * @param {number} limit - Number of records to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise} - Promise with formatted valuable drops data
 */
const getValuableDrops = async (filters = {}, sorting = { field: 'timestamp', direction: 'desc' }, limit = 20, offset = 0) => {
  try {
    const response = await valuableDropsApi.fetchValuableDrops(filters, sorting, limit, offset);
    
    // Process the drops and add any additional information
    const drops = response.items.map(drop => ({
      ...drop,
      valueFormatted: formatGp(drop.value),
      valueClass: getValueColorClass(drop.value)
    }));
    
    return {
      items: drops,
      pagination: response.pagination
    };
  } catch (error) {
    console.error('Error fetching valuable drops:', error);
    store.dispatch(addNotification({
      type: 'error',
      message: 'Failed to fetch valuable drops'
    }));
    return { items: [], pagination: { totalCount: 0, offset, limit, hasMore: false } };
  }
};

/**
 * Add a new valuable drop
 * @param {Object} dropData - The valuable drop data
 * @param {Object} wikiService - Optional WikiService instance for price validation
 * @returns {Promise} - Promise with the created drop
 */
const addValuableDrop = async (dropData, wikiService = null) => {
  try {
    // Validate and process the drop data before submitting
    const processedData = { ...dropData };
    
    // If we have a WikiService, try to validate/update the price
    if (wikiService && processedData.itemId) {
      try {
        const wikiData = await wikiService.getItemDetails(processedData.itemId);
        if (wikiData && wikiData.price) {
          // Update the value based on Wiki pricing
          processedData.value = wikiData.price * (processedData.quantity || 1);
        }
      } catch (wikiError) {
        console.warn('Failed to get Wiki pricing for item:', wikiError);
        // Continue with the original value
      }
    }
    
    // Submit the drop to the API
    const response = await valuableDropsApi.submitValuableDrop(processedData);
    
    // Check if this drop qualifies for any group challenges
    if (groupChallengesService) {
      try {
        await groupChallengesService.checkValuableDropChallenges(response);
      } catch (challengeError) {
        console.warn('Error checking drop against challenges:', challengeError);
      }
    }
    
    // Add success notification
    store.dispatch(addNotification({
      type: 'success',
      message: `Added valuable drop: ${processedData.quantity || 1}x ${processedData.itemName || 'Unknown'} (${formatGp(processedData.value)})`
    }));
    
    return response;
  } catch (error) {
    console.error('Error adding valuable drop:', error);
    store.dispatch(addNotification({
      type: 'error',
      message: 'Failed to add valuable drop'
    }));
    throw error;
  }
};

/**
 * Remove a valuable drop
 * @param {string} dropId - The ID of the drop to remove
 * @returns {Promise} - Promise with the result of the operation
 */
const removeValuableDrop = async (dropId) => {
  try {
    const response = await valuableDropsApi.deleteValuableDrop(dropId);
    
    store.dispatch(addNotification({
      type: 'success',
      message: 'Valuable drop removed successfully'
    }));
    
    return response;
  } catch (error) {
    console.error('Error removing valuable drop:', error);
    store.dispatch(addNotification({
      type: 'error',
      message: 'Failed to remove valuable drop'
    }));
    throw error;
  }
};

/**
 * Get drop statistics
 * @returns {Promise} - Promise with drop statistics
 */
const getDropStatistics = async () => {
  try {
    return await valuableDropsApi.fetchDropStatistics();
  } catch (error) {
    console.error('Error fetching drop statistics:', error);
    return { totalValue: 0, count: 0, topDrops: [] };
  }
};

/**
 * Export drop data to CSV format
 * @param {Array} drops - Array of drop data
 * @returns {string} - CSV formatted string
 */
const exportToCsv = (drops) => {
  if (!drops || !drops.length) {
    return '';
  }
  
  // Define CSV headers
  const headers = ['Item', 'Quantity', 'Value', 'Member', 'Source', 'Date'];
  
  // Convert drops to CSV rows
  const rows = drops.map(drop => [
    drop.itemName || 'Unknown',
    drop.quantity || 1,
    drop.value || 0,
    drop.member || 'Unknown',
    drop.source || 'Unknown',
    new Date(drop.timestamp).toLocaleString()
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
};

// Create and export the service as a singleton instance
const ValuableDropsService = {
  formatGp,
  processPluginDrop,
  isItemValuable,
  getValueColorClass,
  getValuableDrops,
  addValuableDrop,
  removeValuableDrop,
  getDropStatistics,
  exportToCsv
};

// Export both the service object and individual functions for compatibility
export default ValuableDropsService;
export { processPluginDrop, isItemValuable, formatGp };
