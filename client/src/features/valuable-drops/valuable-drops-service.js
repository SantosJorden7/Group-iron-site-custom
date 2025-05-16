/**
 * Valuable Drops Business Logic
 * Contains all the business logic for the Valuable Drops feature
 */
import * as valuableDropsApi from './valuable-drops-api';
import groupChallengesService from '../group-challenges/group-challenges-service';
import { store } from '../../store/store';
import { addNotification } from '../../store/actions/notificationActions';

/**
 * Format currency value (GP) with proper formatting
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted amount (e.g., "1.2M" for 1,200,000)
 */
export const formatGp = (amount) => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

/**
 * Get color class based on value
 * @param {number} value - Item value in GP
 * @returns {string} - CSS class name for coloring
 */
export const getValueColorClass = (value) => {
  if (value >= 10000000) {
    return 'valuable-legendary'; // 10M+
  } else if (value >= 1000000) {
    return 'valuable-rare'; // 1M+
  } else if (value >= 100000) {
    return 'valuable-uncommon'; // 100K+
  } else {
    return 'valuable-common'; // < 100K
  }
};

/**
 * Get valuable drops with optional filtering and sorting
 * @param {Object} filters - Optional filters to apply
 * @param {Object} sorting - Optional sorting configuration
 * @param {number} limit - Number of records to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise} - Promise with formatted valuable drops data
 */
export const getValuableDrops = async (filters = {}, sorting = { field: 'timestamp', direction: 'desc' }, limit = 20, offset = 0) => {
  try {
    const dropsData = await valuableDropsApi.fetchValuableDrops(filters, sorting, limit, offset);
    
    // Format data for display
    if (dropsData.drops && dropsData.drops.length > 0) {
      dropsData.drops = dropsData.drops.map(drop => {
        const totalValue = drop.total_value || drop.item_value * drop.item_quantity;
        
        return {
          ...drop,
          formatted_value: formatGp(drop.item_value),
          formatted_total_value: formatGp(totalValue),
          value_color_class: getValueColorClass(totalValue),
          formatted_date: new Date(drop.timestamp).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      });
    }
    
    return dropsData;
  } catch (error) {
    console.error('Failed to get valuable drops:', error);
    throw error;
  }
};

/**
 * Add a new valuable drop
 * @param {Object} dropData - The valuable drop data
 * @param {Object} wikiService - Optional WikiService instance for price validation
 * @returns {Promise} - Promise with the created drop
 */
export const addValuableDrop = async (dropData, wikiService = null) => {
  try {
    // Validate drop data
    if (!dropData.member_name || !dropData.item_id || !dropData.item_name || !dropData.item_value) {
      throw new Error('Missing required drop information');
    }
    
    // If WikiService is provided, try to validate/update the item price
    let verifiedValue = parseInt(dropData.item_value, 10);
    if (wikiService && dropData.item_name) {
      try {
        const prices = await wikiService.getItemPrices([dropData.item_name]);
        if (prices && prices[dropData.item_name]) {
          // If the provided value differs significantly from wiki price (±20%), suggest using wiki price
          const wikiPrice = prices[dropData.item_name];
          const priceDiff = Math.abs(wikiPrice - verifiedValue) / wikiPrice;
          
          if (priceDiff > 0.2) {
            // Use wiki price but notify user
            verifiedValue = wikiPrice;
            store.dispatch(
              addNotification({
                id: `drop-price-update-${Date.now()}`,
                type: 'info',
                title: 'Item Price Updated',
                message: `We've updated the price of ${dropData.item_name} to match the current Wiki price of ${formatGp(wikiPrice)}.`,
                autoDismiss: true
              })
            );
          }
        }
      } catch (error) {
        console.warn('Failed to validate item price with WikiService:', error);
      }
    }
    
    // Ensure numeric values
    const formattedData = {
      ...dropData,
      item_id: parseInt(dropData.item_id, 10),
      item_value: verifiedValue,
      item_quantity: parseInt(dropData.item_quantity || 1, 10)
    };
    
    const result = await valuableDropsApi.submitValuableDrop(formattedData);

    // After submitting the drop, update relevant challenges
    try {
      const updatedChallenges = await groupChallengesService.processValuableDrop(
        formattedData,
        formattedData.member_name
      );
      
      // If challenges were updated, show a notification
      if (updatedChallenges && updatedChallenges.length > 0) {
        store.dispatch(
          addNotification({
            id: `drop-challenge-update-${Date.now()}`,
            type: 'success',
            title: 'Challenge Progress Updated',
            message: `This drop contributed to ${updatedChallenges.length} active challenge(s)!`,
            autoDismiss: true
          })
        );
      }
    } catch (challengeError) {
      console.warn('Failed to update challenges with new drop:', challengeError);
    }
    
    return result;
  } catch (error) {
    console.error('Failed to add valuable drop:', error);
    throw error;
  }
};

/**
 * Remove a valuable drop
 * @param {string} dropId - The ID of the drop to remove
 * @returns {Promise} - Promise with the result of the operation
 */
export const removeValuableDrop = async (dropId) => {
  try {
    return await valuableDropsApi.deleteValuableDrop(dropId);
  } catch (error) {
    console.error('Failed to remove valuable drop:', error);
    throw error;
  }
};

/**
 * Get drop statistics
 * @returns {Promise} - Promise with drop statistics
 */
export const getDropStatistics = async () => {
  try {
    return await valuableDropsApi.fetchDropStatistics();
  } catch (error) {
    console.error('Failed to get drop statistics:', error);
    throw error;
  }
};

/**
 * Export drop data to CSV format
 * @param {Array} drops - Array of drop data
 * @returns {string} - CSV formatted string
 */
export const exportToCsv = (drops) => {
  if (!drops || !drops.length) return '';
  
  const headers = ['Member', 'Item', 'Quantity', 'Value', 'Total Value', 'Source', 'Date'];
  const csv = [
    headers.join(','),
    ...drops.map(drop => [
      drop.member_name,
      `"${drop.item_name}"`,
      drop.item_quantity,
      drop.item_value,
      drop.total_value || drop.item_value * drop.item_quantity,
      `"${drop.source_name || ''}"`,
      new Date(drop.timestamp).toISOString()
    ].join(','))
  ].join('\n');
  
  return csv;
};
