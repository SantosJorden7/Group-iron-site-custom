/**
 * Activities API Service
 * Handles all API communication for the Activities feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch all activities for a group
 * @param {string} groupId - The group ID
 * @returns {Promise} - Promise with activities data
 */
export const fetchGroupActivities = async (groupId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/activities/group/${groupId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch group activities');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching group activities:', error);
    throw error;
  }
};

/**
 * Fetch activities for a specific member
 * @param {string} memberName - The name of the group member
 * @returns {Promise} - Promise with member activities data
 */
export const fetchMemberActivities = async (memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/activities/member/${memberName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch member activities');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching activities for ${memberName}:`, error);
    throw error;
  }
};

/**
 * Submit a new activity for a member
 * @param {string} memberName - The name of the group member
 * @param {Object} activityData - The activity data to submit
 * @returns {Promise} - Promise with the created activity
 */
export const submitActivity = async (memberName, activityData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/activities/member/${memberName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit activity');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting activity:', error);
    throw error;
  }
};

/**
 * Upload proof image for an activity
 * @param {string} activityId - The ID of the activity
 * @param {File} imageFile - The image file to upload
 * @returns {Promise} - Promise with the updated activity
 */
export const uploadActivityProof = async (activityId, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('proof', imageFile);

    const response = await fetch(`${API_BASE_URL}/custom/activities/${activityId}/proof`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload proof');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading activity proof:', error);
    throw error;
  }
};

/**
 * Delete an activity
 * @param {string} activityId - The ID of the activity to delete
 * @returns {Promise} - Promise with deletion confirmation
 */
export const deleteActivity = async (activityId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/activities/${activityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete activity');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

/**
 * Fetch activity categories
 * @returns {Promise} - Promise with categories data
 */
export const fetchActivityCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/activities/categories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch activity categories');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching activity categories:', error);
    throw error;
  }
};
