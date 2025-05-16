/**
 * Group Milestones API Service
 * 
 * Handles all API calls related to group milestones
 */

// API base URL - same as other API calls
import { API_BASE_URL } from '../../config';

/**
 * Fetch all group milestones with optional filters
 * 
 * @param {Object} filters - Optional filters (milestone_type, include_completed)
 * @returns {Promise<Array>} - List of milestones with progress information
 */
export const fetchGroupMilestones = async (filters = {}) => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filters.milestone_type) {
      queryParams.append('milestone_type', filters.milestone_type);
    }
    
    if (filters.include_completed !== undefined) {
      queryParams.append('include_completed', filters.include_completed);
    }
    
    // Get the authorization token from local storage
    const token = localStorage.getItem('groupToken');
    const groupName = localStorage.getItem('groupName');
    
    if (!token) {
      throw new Error('No authorization token found');
    }
    
    if (!groupName) {
      throw new Error('No group name found');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/group/${groupName}/milestones?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch milestones: ${response.status}`);
    }
    
    const data = await response.json();
    return data.milestones;
  } catch (error) {
    console.error('Error fetching group milestones:', error);
    throw error;
  }
};

/**
 * Create a new group milestone
 * 
 * @param {Object} milestone - The milestone data to create
 * @returns {Promise<Object>} - The created milestone data
 */
export const createGroupMilestone = async (milestone) => {
  try {
    // Get the authorization token from local storage
    const token = localStorage.getItem('groupToken');
    const groupName = localStorage.getItem('groupName');
    
    if (!token) {
      throw new Error('No authorization token found');
    }
    
    if (!groupName) {
      throw new Error('No group name found');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/group/${groupName}/milestones`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(milestone)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create milestone: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating group milestone:', error);
    throw error;
  }
};

/**
 * Update a milestone's completion status
 * 
 * @param {number} milestoneId - The ID of the milestone to update
 * @param {boolean} completed - The new completion status
 * @returns {Promise<Object>} - The update result
 */
export const updateMilestoneStatus = async (milestoneId, completed) => {
  try {
    // Get the authorization token from local storage
    const token = localStorage.getItem('groupToken');
    const groupName = localStorage.getItem('groupName');
    
    if (!token) {
      throw new Error('No authorization token found');
    }
    
    if (!groupName) {
      throw new Error('No group name found');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/group/${groupName}/milestones/${milestoneId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completed })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update milestone status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating milestone status:', error);
    throw error;
  }
};

/**
 * Update a member's progress for a milestone
 * 
 * @param {number} milestoneId - The ID of the milestone
 * @param {string} memberName - The name of the member
 * @param {Object} progress - The progress data to update
 * @returns {Promise<Object>} - The update result
 */
export const updateMemberProgress = async (milestoneId, memberName, progress) => {
  try {
    // Get the authorization token from local storage
    const token = localStorage.getItem('groupToken');
    const groupName = localStorage.getItem('groupName');
    
    if (!token) {
      throw new Error('No authorization token found');
    }
    
    if (!groupName) {
      throw new Error('No group name found');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/group/${groupName}/milestones/${milestoneId}/members/${memberName}/progress`, {
      method: 'PATCH',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(progress)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update member progress: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating member progress:', error);
    throw error;
  }
};

/**
 * Delete a group milestone
 * 
 * @param {number} milestoneId - The ID of the milestone to delete
 * @returns {Promise<Object>} - The delete result
 */
export const deleteGroupMilestone = async (milestoneId) => {
  try {
    // Get the authorization token from local storage
    const token = localStorage.getItem('groupToken');
    const groupName = localStorage.getItem('groupName');
    
    if (!token) {
      throw new Error('No authorization token found');
    }
    
    if (!groupName) {
      throw new Error('No group name found');
    }
    
    // Make the API request
    const response = await fetch(`${API_BASE_URL}/api/group/${groupName}/milestones/${milestoneId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete milestone: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting group milestone:', error);
    throw error;
  }
};
