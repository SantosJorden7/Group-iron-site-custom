/**
 * Valuable Drops API Services
 * Handles all API communication for the Valuable Drops feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch valuable drops with optional filtering
 * @param {Object} filters - Optional filters to apply (member, minValue, itemId, etc.)
 * @param {Object} sorting - Optional sorting configuration (field, direction)
 * @param {number} limit - Number of records to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise} - Promise with valuable drops data
 */
export const fetchValuableDrops = async (filters = {}, sorting = { field: 'timestamp', direction: 'desc' }, limit = 20, offset = 0) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add filters
    if (filters.member) queryParams.append('member', filters.member);
    if (filters.minValue) queryParams.append('minValue', filters.minValue);
    if (filters.maxValue) queryParams.append('maxValue', filters.maxValue);
    if (filters.itemId) queryParams.append('itemId', filters.itemId);
    if (filters.itemName) queryParams.append('itemName', filters.itemName);
    if (filters.source) queryParams.append('source', filters.source);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    
    // Add sorting
    queryParams.append('sortBy', sorting.field);
    queryParams.append('sortDirection', sorting.direction);
    
    // Add pagination
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);
    
    const response = await fetch(`${API_BASE_URL}/custom/valuable-drops?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch valuable drops');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching valuable drops:', error);
    throw error;
  }
};

/**
 * Submit a new valuable drop
 * @param {Object} dropData - The valuable drop data to submit
 * @returns {Promise} - Promise with the created drop
 */
export const submitValuableDrop = async (dropData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/valuable-drops`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dropData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit valuable drop');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting valuable drop:', error);
    throw error;
  }
};

/**
 * Delete a valuable drop
 * @param {number} dropId - The ID of the drop to delete
 * @returns {Promise} - Promise with the result
 */
export const deleteValuableDrop = async (dropId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/valuable-drops/${dropId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete valuable drop');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting valuable drop:', error);
    throw error;
  }
};

/**
 * Fetch drop statistics for the group
 * @returns {Promise} - Promise with drop statistics
 */
export const fetchDropStatistics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/valuable-drops/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch drop statistics');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching drop statistics:', error);
    throw error;
  }
};
