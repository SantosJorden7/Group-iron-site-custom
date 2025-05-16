/**
 * Calendar Service
 * 
 * Handles interaction with the backend API for shared calendar functionality.
 * Provides methods for retrieving, creating, updating, and deleting calendar events.
 */

import apiClient from '../../api/apiClient';

class CalendarService {
  constructor() {
    this.events = [];
    this.groupId = null;
    this.cache = {
      lastFetch: null,
      events: []
    };
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Initialize the service with a group ID
   * @param {string} groupId - The group ID
   */
  initialize(groupId) {
    this.groupId = groupId;
  }

  /**
   * Retrieve events from the API or cache
   * @param {string} groupId - The group ID
   * @param {string} startDate - Start date for filtering (ISO string)
   * @param {string} endDate - End date for filtering (ISO string)
   * @returns {Promise<Array>} - Array of events
   */
  async getEvents(groupId, startDate, endDate) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    // Check if we have a recent cache
    const now = new Date().getTime();
    if (
      this.cache.lastFetch &&
      now - this.cache.lastFetch < this.CACHE_TTL &&
      this.cache.groupId === groupId
    ) {
      // Filter cached events by date range if needed
      if (startDate && endDate) {
        return this.filterEventsByDateRange(this.cache.events, startDate, endDate);
      }
      return this.cache.events;
    }

    try {
      // Fetch events from API
      const response = await apiClient.get(`/api/calendar/events`, {
        params: {
          groupId,
          startDate,
          endDate
        }
      });

      // Update cache
      this.cache = {
        lastFetch: now,
        groupId,
        events: response.data
      };

      return response.data;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Filter events by date range
   * @param {Array} events - Array of events
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Array} - Filtered events
   */
  filterEventsByDateRange(events, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return events.filter(event => {
      const eventStart = new Date(event.startDateTime);
      return eventStart >= start && eventStart <= end;
    });
  }

  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} - Created event
   */
  async createEvent(eventData) {
    try {
      const response = await apiClient.post('/api/calendar/events', eventData);
      
      // Invalidate cache
      this.cache.lastFetch = null;
      
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   * @param {string} eventId - ID of event to update
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} - Updated event
   */
  async updateEvent(eventId, eventData) {
    try {
      const response = await apiClient.put(`/api/calendar/events/${eventId}`, eventData);
      
      // Invalidate cache
      this.cache.lastFetch = null;
      
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   * @param {string} eventId - ID of event to delete
   * @returns {Promise<Object>} - Response data
   */
  async deleteEvent(eventId) {
    try {
      const response = await apiClient.delete(`/api/calendar/events/${eventId}`);
      
      // Invalidate cache
      this.cache.lastFetch = null;
      
      return response.data;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific member
   * @param {string} groupId - The group ID
   * @param {string} memberName - The member name
   * @returns {Promise<Array>} - Array of events
   */
  async getMemberEvents(groupId, memberName) {
    try {
      const allEvents = await this.getEvents(groupId);
      return allEvents.filter(event => 
        event.members && event.members.includes(memberName)
      );
    } catch (error) {
      console.error('Error fetching member events:', error);
      throw error;
    }
  }

  /**
   * Get events by type
   * @param {string} groupId - The group ID
   * @param {string} eventType - The event type
   * @returns {Promise<Array>} - Array of events
   */
  async getEventsByType(groupId, eventType) {
    try {
      const allEvents = await this.getEvents(groupId);
      return allEvents.filter(event => event.eventType === eventType);
    } catch (error) {
      console.error('Error fetching events by type:', error);
      throw error;
    }
  }
}

// Create singleton instance
const calendarService = new CalendarService();

export default calendarService;
