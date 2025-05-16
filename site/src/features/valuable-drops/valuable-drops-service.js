/**
 * Valuable Drops Service
 * Handles all API interactions for the valuable drops feature
 */

import ApiClient from '../../services/api-client';

class ValuableDropsService {
  /**
   * Get valuable drops with optional filtering and pagination
   * 
   * @param {Object} filters - Filter parameters
   * @param {string} [filters.memberName] - Filter by member name
   * @param {number} [filters.minValue] - Minimum item value
   * @param {string} [filters.sourceName] - Filter by source name (partial match)
   * @param {string} [filters.itemName] - Filter by item name (partial match)
   * @param {Date} [filters.startDate] - Filter by drops after this date
   * @param {Date} [filters.endDate] - Filter by drops before this date
   * @param {number} [filters.offset=0] - Pagination offset
   * @param {number} [filters.limit=25] - Pagination limit
   * @param {string} [filters.sort='timestamp'] - Sort field (timestamp, item_value, item_name, source_name)
   * @param {string} [filters.direction='desc'] - Sort direction (asc, desc)
   * @returns {Promise<Object>} - Valuable drops with pagination info
   */
  static async getValuableDrops(filters = {}) {
    const queryParams = new URLSearchParams();

    // Add filters to query params
    if (filters.memberName) queryParams.append('member_name', filters.memberName);
    if (filters.minValue) queryParams.append('min_value', filters.minValue);
    if (filters.sourceName) queryParams.append('source_name', filters.sourceName);
    if (filters.itemName) queryParams.append('item_name', filters.itemName);
    
    // Format dates for the API if provided
    if (filters.startDate) queryParams.append('start_date', filters.startDate.toISOString());
    if (filters.endDate) queryParams.append('end_date', filters.endDate.toISOString());
    
    // Pagination and sorting
    queryParams.append('offset', filters.offset || 0);
    queryParams.append('limit', filters.limit || 25);
    queryParams.append('sort', filters.sort || 'timestamp');
    queryParams.append('direction', filters.direction || 'desc');

    return ApiClient.get(`/custom/valuable-drops?${queryParams.toString()}`);
  }

  /**
   * Add a new valuable drop
   * 
   * @param {Object} dropData - The valuable drop data
   * @param {string} dropData.memberName - Member who received the drop
   * @param {number} dropData.itemId - Item ID 
   * @param {string} dropData.itemName - Item name
   * @param {number} [dropData.itemQuantity=1] - Item quantity
   * @param {number} dropData.itemValue - Item GE value
   * @param {string} dropData.sourceName - Source of the drop (e.g., monster name)
   * @param {number} [dropData.xCoord] - Optional x coordinate
   * @param {number} [dropData.yCoord] - Optional y coordinate
   * @param {number} [dropData.zCoord] - Optional z coordinate
   * @returns {Promise<Object>} - Response with drop_id
   */
  static async addValuableDrop(dropData) {
    const payload = {
      member_name: dropData.memberName,
      item_id: dropData.itemId,
      item_name: dropData.itemName,
      item_quantity: dropData.itemQuantity || 1,
      item_value: dropData.itemValue,
      source_name: dropData.sourceName,
      x_coord: dropData.xCoord,
      y_coord: dropData.yCoord,
      z_coord: dropData.zCoord
    };

    return ApiClient.post('/custom/valuable-drops', payload);
  }

  /**
   * Delete a valuable drop
   * 
   * @param {number} dropId - ID of the drop to delete
   * @returns {Promise<Object>} - Response with status
   */
  static async deleteValuableDrop(dropId) {
    return ApiClient.delete(`/custom/valuable-drops/${dropId}`);
  }
}

export default ValuableDropsService;
