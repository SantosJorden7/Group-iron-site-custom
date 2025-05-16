/**
 * Shared Calendar API Service
 * Handles all API communication for the Shared Calendar feature
 */
import { API_BASE_URL } from '../../config';

/**
 * Fetch all events for a group's calendar
 * @param {string} groupId - The group ID
 * @param {Object} params - Optional parameters for filtering (startDate, endDate, type)
 * @returns {Promise} - Promise with events data
 */
export const fetchEvents = async (groupId, params = {}) => {
  try {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.type) queryParams.append('type', params.type);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const response = await fetch(`${API_BASE_URL}/custom/calendar/group/${groupId}${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch calendar events');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

/**
 * Fetch a specific event from the calendar
 * @param {string} eventId - The event ID
 * @returns {Promise} - Promise with event data
 */
export const fetchEventDetails = async (eventId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch event details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error;
  }
};

/**
 * Create a new event in the calendar
 * @param {string} groupId - The group ID
 * @param {Object} eventData - The event data
 * @returns {Promise} - Promise with the created event
 */
export const createEvent = async (groupId, eventData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/group/${groupId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

/**
 * Update an existing event in the calendar
 * @param {string} eventId - The event ID
 * @param {Object} eventData - The updated event data
 * @returns {Promise} - Promise with the updated event
 */
export const updateEvent = async (eventId, eventData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

/**
 * Delete an event from the calendar
 * @param {string} eventId - The event ID
 * @returns {Promise} - Promise with deletion confirmation
 */
export const deleteEvent = async (eventId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

/**
 * Fetch events linked to challenges
 * @param {string} groupId - The group ID
 * @returns {Promise} - Promise with challenge events data
 */
export const fetchChallengeEvents = async (groupId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/group/${groupId}/challenges`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch challenge events');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching challenge events:', error);
    throw error;
  }
};

/**
 * Add a participant to an event
 * @param {string} eventId - The event ID
 * @param {string} memberName - The member's name
 * @returns {Promise} - Promise with the updated event
 */
export const addParticipant = async (eventId, memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/events/${eventId}/participants`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberName })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add participant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
};

/**
 * Remove a participant from an event
 * @param {string} eventId - The event ID
 * @param {string} memberName - The member's name
 * @returns {Promise} - Promise with the updated event
 */
export const removeParticipant = async (eventId, memberName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/events/${eventId}/participants/${memberName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to remove participant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
};

/**
 * Sync a challenge with the calendar (create or update event)
 * @param {string} groupId - The group ID
 * @param {string} challengeId - The challenge ID
 * @returns {Promise} - Promise with the created/updated event
 */
export const syncChallengeToCalendar = async (groupId, challengeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/custom/calendar/group/${groupId}/sync-challenge/${challengeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to sync challenge with calendar');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing challenge with calendar:', error);
    throw error;
  }
};
