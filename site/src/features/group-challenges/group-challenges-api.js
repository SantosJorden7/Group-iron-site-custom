/**
 * Group Challenges API Service
 * Handles all API communication for the Group Challenges feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch all active challenges for a group
 * @param {string} groupId - The group ID
 * @returns {Promise} - Promise with active challenges data
 */
export const fetchActiveChallenges = async (groupId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/group/${groupId}/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch active challenges');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching active challenges:', error);
    throw error;
  }
};

/**
 * Fetch all completed challenges for a group
 * @param {string} groupId - The group ID
 * @returns {Promise} - Promise with completed challenges data
 */
export const fetchCompletedChallenges = async (groupId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/group/${groupId}/completed`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch completed challenges');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching completed challenges:', error);
    throw error;
  }
};

/**
 * Fetch challenge details including member contributions
 * @param {string} challengeId - The challenge ID
 * @returns {Promise} - Promise with challenge details
 */
export const fetchChallengeDetails = async (challengeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/${challengeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch challenge details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching challenge details:', error);
    throw error;
  }
};

/**
 * Create a new challenge for a group
 * @param {string} groupId - The group ID
 * @param {Object} challengeData - The challenge data
 * @returns {Promise} - Promise with the created challenge
 */
export const createChallenge = async (groupId, challengeData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/group/${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(challengeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
};

/**
 * Update an existing challenge
 * @param {string} challengeId - The challenge ID
 * @param {Object} challengeData - The updated challenge data
 * @returns {Promise} - Promise with the updated challenge
 */
export const updateChallenge = async (challengeId, challengeData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(challengeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating challenge:', error);
    throw error;
  }
};

/**
 * Delete a challenge
 * @param {string} challengeId - The challenge ID
 * @returns {Promise} - Promise with deletion confirmation
 */
export const deleteChallenge = async (challengeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/${challengeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting challenge:', error);
    throw error;
  }
};

/**
 * Update member's contribution to a challenge
 * @param {string} challengeId - The challenge ID
 * @param {string} memberName - The member's name
 * @param {Object} contributionData - The contribution data
 * @returns {Promise} - Promise with the updated contribution
 */
export const updateContribution = async (challengeId, memberName, contributionData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/${challengeId}/members/${memberName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contributionData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update contribution');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating contribution:', error);
    throw error;
  }
};

/**
 * Fetch challenge types/templates
 * @returns {Promise} - Promise with challenge types data
 */
export const fetchChallengeTypes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch challenge types');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching challenge types:', error);
    throw error;
  }
};

/**
 * Complete a challenge
 * @param {string} challengeId - The challenge ID
 * @returns {Promise} - Promise with the completed challenge
 */
export const completeChallenge = async (challengeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/challenges/${challengeId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to complete challenge');
    }

    return await response.json();
  } catch (error) {
    console.error('Error completing challenge:', error);
    throw error;
  }
};
