/**
 * Slayer Task API Services
 * Handles all API communication for the Slayer Task feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch the current slayer task and history for a group member
 * @param {string} memberName - The name of the group member
 * @returns {Promise} - Promise with slayer task data
 */
export const fetchSlayerTask = async (memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/slayer-task/${memberName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch slayer task');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching slayer task:', error);
    throw error;
  }
};

/**
 * Submit a new slayer task for a group member
 * @param {string} memberName - The name of the group member
 * @param {Object} taskData - The slayer task data to submit
 * @returns {Promise} - Promise with the created task
 */
export const submitSlayerTask = async (memberName, taskData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/slayer-task/${memberName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit slayer task');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting slayer task:', error);
    throw error;
  }
};

/**
 * Fetch group slayer statistics
 * @returns {Promise} - Promise with group slayer statistics
 */
export const fetchGroupSlayerStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/slayer-stats/group`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch group slayer stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching group slayer stats:', error);
    throw error;
  }
};
