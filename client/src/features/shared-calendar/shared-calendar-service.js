/**
 * Shared Calendar Service
 * Handles business logic for the Shared Calendar feature
 * Integrates with Group Challenges
 */
import * as calendarApi from './shared-calendar-api';
import groupChallengesService from '../group-challenges/group-challenges-service';

class SharedCalendarService {
  constructor() {
    this.events = [];
    this.currentGroupId = null;
    this.eventCache = new Map();
    this.eventsLoaded = false;
  }

  /**
   * Initialize the service with a group ID
   * @param {string} groupId - The group ID
   */
  initialize(groupId) {
    this.currentGroupId = groupId;
    this.eventCache.clear();
    this.eventsLoaded = false;
  }

  /**
   * Get all events for the current group's calendar
   * @param {Object} params - Optional parameters for filtering (startDate, endDate, type)
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Calendar events
   */
  async getEvents(params = {}, forceRefresh = false) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    // Only fetch from API if we haven't loaded events yet, or if forceRefresh is true
    if (forceRefresh || !this.eventsLoaded) {
      try {
        this.events = await calendarApi.fetchEvents(this.currentGroupId, params);
        this.eventsLoaded = true;
      } catch (error) {
        console.error('Failed to get calendar events:', error);
        throw error;
      }
    } else if (params.startDate || params.endDate || params.type) {
      // If we have params but don't want to force refresh all events,
      // filter the existing events client-side
      return this.filterEvents(params);
    }

    return this.events;
  }

  /**
   * Filter events based on provided parameters
   * @param {Object} params - Filter parameters (startDate, endDate, type)
   * @returns {Array} - Filtered events
   */
  filterEvents(params = {}) {
    let filteredEvents = [...this.events];
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= startDate;
      });
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate <= endDate;
      });
    }
    
    if (params.type) {
      filteredEvents = filteredEvents.filter(event => event.event_type === params.type);
    }
    
    return filteredEvents;
  }

  /**
   * Get details for a specific event
   * @param {string} eventId - The event ID
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Object>} - Event details
   */
  async getEventDetails(eventId, forceRefresh = false) {
    if (!eventId) {
      throw new Error('Event ID is required');
    }

    if (forceRefresh || !this.eventCache.has(eventId)) {
      try {
        const eventDetails = await calendarApi.fetchEventDetails(eventId);
        this.eventCache.set(eventId, eventDetails);
      } catch (error) {
        console.error(`Failed to get details for event ${eventId}:`, error);
        throw error;
      }
    }

    return this.eventCache.get(eventId);
  }

  /**
   * Create a new event in the calendar
   * @param {Object} eventData - The event data
   * @returns {Promise<Object>} - Newly created event
   */
  async createEvent(eventData) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    try {
      const newEvent = await calendarApi.createEvent(this.currentGroupId, eventData);
      
      // Update the events list
      this.events = [newEvent, ...this.events];
      
      return newEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event in the calendar
   * @param {string} eventId - The event ID
   * @param {Object} eventData - The updated event data
   * @returns {Promise<Object>} - Updated event
   */
  async updateEvent(eventId, eventData) {
    try {
      const updatedEvent = await calendarApi.updateEvent(eventId, eventData);
      
      // Update cache and lists
      this.eventCache.set(eventId, updatedEvent);
      
      // Update in events list if present
      this.events = this.events.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to update event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an event from the calendar
   * @param {string} eventId - The event ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async deleteEvent(eventId) {
    try {
      await calendarApi.deleteEvent(eventId);
      
      // Remove from cache and lists
      this.eventCache.delete(eventId);
      this.events = this.events.filter(e => e.id !== eventId);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Get events linked to challenges
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Challenge events
   */
  async getChallengeEvents(forceRefresh = false) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    try {
      return await calendarApi.fetchChallengeEvents(this.currentGroupId);
    } catch (error) {
      console.error('Failed to get challenge events:', error);
      throw error;
    }
  }

  /**
   * Add a participant to an event
   * @param {string} eventId - The event ID
   * @param {string} memberName - The member's name
   * @returns {Promise<Object>} - Updated event
   */
  async addParticipant(eventId, memberName) {
    try {
      const updatedEvent = await calendarApi.addParticipant(eventId, memberName);
      
      // Update cache and lists
      this.eventCache.set(eventId, updatedEvent);
      
      // Update in events list if present
      this.events = this.events.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to add participant ${memberName} to event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a participant from an event
   * @param {string} eventId - The event ID
   * @param {string} memberName - The member's name
   * @returns {Promise<Object>} - Updated event
   */
  async removeParticipant(eventId, memberName) {
    try {
      const updatedEvent = await calendarApi.removeParticipant(eventId, memberName);
      
      // Update cache and lists
      this.eventCache.set(eventId, updatedEvent);
      
      // Update in events list if present
      this.events = this.events.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to remove participant ${memberName} from event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize a challenge with the calendar
   * Creates or updates an event based on the challenge
   * @param {string} challengeId - The challenge ID
   * @returns {Promise<Object>} - Created or updated event
   */
  async syncChallengeToCalendar(challengeId) {
    if (!this.currentGroupId) {
      throw new Error('Group ID not set. Call initialize() first.');
    }

    try {
      const event = await calendarApi.syncChallengeToCalendar(this.currentGroupId, challengeId);
      
      // Update or add the event in the list
      const existingEventIndex = this.events.findIndex(e => 
        e.related_challenge_id === challengeId
      );
      
      if (existingEventIndex >= 0) {
        this.events[existingEventIndex] = event;
      } else {
        this.events.push(event);
      }
      
      // Add to cache
      this.eventCache.set(event.id, event);
      
      return event;
    } catch (error) {
      console.error(`Failed to sync challenge ${challengeId} with calendar:`, error);
      throw error;
    }
  }

  /**
   * Get events for the specified date range
   * @param {Date} startDate - Start date for the range
   * @param {Date} endDate - End date for the range
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Events in the date range
   */
  async getEventsInRange(startDate, endDate, forceRefresh = false) {
    const params = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    return await this.getEvents(params, forceRefresh);
  }

  /**
   * Get events for the current week
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Events for the current week
   */
  async getCurrentWeekEvents(forceRefresh = false) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday of current week
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday of current week
    
    return await this.getEventsInRange(startOfWeek, endOfWeek, forceRefresh);
  }

  /**
   * Get events for the current month
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Events for the current month
   */
  async getCurrentMonthEvents(forceRefresh = false) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return await this.getEventsInRange(startOfMonth, endOfMonth, forceRefresh);
  }

  /**
   * Get upcoming events (next X days)
   * @param {number} days - Number of days to look ahead
   * @param {boolean} forceRefresh - Whether to force a refresh from the API
   * @returns {Promise<Array>} - Upcoming events
   */
  async getUpcomingEvents(days = 7, forceRefresh = false) {
    const today = new Date();
    const future = new Date(today);
    future.setDate(today.getDate() + days);
    
    return await this.getEventsInRange(today, future, forceRefresh);
  }

  /**
   * Create an event from a challenge
   * @param {Object} challenge - The challenge object
   * @returns {Promise<Object>} - Created event
   */
  async createEventFromChallenge(challenge) {
    if (!challenge || !challenge.id) {
      throw new Error('Valid challenge object is required');
    }
    
    // Get challenge details if not fully populated
    const challengeDetails = challenge.target ? 
      challenge : 
      await groupChallengesService.getChallengeDetails(challenge.id);
    
    // Create event data from challenge
    const eventData = {
      title: `Challenge: ${challengeDetails.title}`,
      description: challengeDetails.description,
      start_date: challengeDetails.start_date,
      end_date: challengeDetails.end_date,
      location: 'Group Challenge',
      event_type: 'challenge',
      related_challenge_id: challengeDetails.id,
      participants: challengeDetails.participating_members || [],
      color: '#FFD700', // Gold color for challenge events
      all_day: true
    };
    
    return await this.createEvent(eventData);
  }

  /**
   * Format events for calendar display
   * @param {Array} events - Raw events from API
   * @returns {Array} - Formatted events for calendar component
   */
  formatEventsForCalendar(events) {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    return events.map(event => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      allDay: event.all_day,
      color: event.color || this.getEventTypeColor(event.event_type),
      extendedProps: {
        description: event.description,
        location: event.location,
        type: event.event_type,
        relatedChallengeId: event.related_challenge_id,
        participants: event.participants
      }
    }));
  }

  /**
   * Get color for event type
   * @param {string} eventType - The event type
   * @returns {string} - Color hex code
   */
  getEventTypeColor(eventType) {
    const colors = {
      challenge: '#FFD700', // Gold
      boss: '#FF4500', // OrangeRed
      slayer: '#8A2BE2', // BlueViolet
      group_activity: '#3CB371', // MediumSeaGreen
      meeting: '#1E90FF', // DodgerBlue
      milestone: '#FF1493', // DeepPink
      deadline: '#DC143C', // Crimson
      personal: '#808080' // Gray
    };
    
    return colors[eventType] || '#808080'; // Default gray
  }
}

// Create a singleton instance
const sharedCalendarService = new SharedCalendarService();

export default sharedCalendarService;
