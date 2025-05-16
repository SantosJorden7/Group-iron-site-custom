import React, { useState, useEffect, useContext } from 'react';
import {
  Row, Col, Card, Button, Form, Modal,
  OverlayTrigger, Tooltip, Badge, Alert
} from 'react-bootstrap';
import { Calendar } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { GroupContext } from '../../contexts/GroupContext';
import { useSync } from '../../contexts/SyncContext';
import sharedCalendarService from './shared-calendar-service';
import groupChallengesService from '../group-challenges/group-challenges-service';
import './SharedCalendarPanel.css';

const EventTypeColors = {
  challenge: '#FFD700', // Gold
  boss: '#FF4500', // OrangeRed
  slayer: '#8A2BE2', // BlueViolet
  group_activity: '#3CB371', // MediumSeaGreen
  meeting: '#1E90FF', // DodgerBlue
  milestone: '#FF1493', // DeepPink
  deadline: '#DC143C', // Crimson
  personal: '#808080' // Gray
};

const EventTypes = [
  { value: 'boss', label: 'Boss Fight' },
  { value: 'slayer', label: 'Slayer Task' },
  { value: 'group_activity', label: 'Group Activity' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'personal', label: 'Personal' }
];

const DataSourceTypes = {
  PLUGIN: 'plugin',
  WISE_OLD_MAN: 'wise_old_man',
  WIKI: 'wiki'
};

const DataSourceBadges = {
  [DataSourceTypes.PLUGIN]: 'Plugin',
  [DataSourceTypes.WISE_OLD_MAN]: 'Wise Old Man',
  [DataSourceTypes.WIKI]: 'Wiki'
};

const SharedCalendarPanel = () => {
  const { group } = useContext(GroupContext);
  const { syncState, performSync } = useSync();
  const calendarRef = React.useRef(null);
  
  // State variables
  const [events, setEvents] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [currentViewInfo, setCurrentViewInfo] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    eventsDataSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
  });
  
  // Form state for creating/editing events
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '12:00',
    endDate: '',
    endTime: '13:00',
    location: '',
    eventType: 'group_activity',
    allDay: false,
    participants: [],
    relatedChallengeId: '',
    color: '#3CB371' // Default to group activity color
  });

  // Initialize services when group changes
  useEffect(() => {
    if (group?.id) {
      sharedCalendarService.initialize(group.id);
      loadCalendarData();
      
      // Trigger sync when component mounts
      if (!syncState.syncInProgress) {
        performSync(false); // Background sync
      }
    }
  }, [group?.id]);
  
  // Subscribe to sync updates
  useEffect(() => {
    // Refresh events when sync completes
    if (syncState.lastSyncTime && !syncState.syncInProgress) {
      loadCalendarData();
    }
  }, [syncState.lastSyncTime, syncState.syncInProgress]);
  
  // Load calendar data from service
  const loadCalendarData = async () => {
    if (!group?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from plugin first
      const result = await sharedCalendarService.getCurrentMonthEvents(true);
      
      // Enrich events with wiki data where applicable
      const enrichedEvents = await enrichEventsWithWikiData(result);
      
      setEvents(enrichedEvents);
      
      // Update data source info
      setDataSourceInfo(prev => ({
        ...prev,
        eventsDataSource: DataSourceTypes.PLUGIN,
        lastPluginSync: new Date()
      }));
      
      // Even if plugin data is available, also try to load WOM data as backup
      loadWomEvents();
    } catch (err) {
      console.error('Error loading events from plugin:', err);
      
      // Try to load from Wise Old Man if plugin fails
      loadWomEvents(true);
      
      if (!events.length > 0) {
        setError('Failed to load calendar events. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load event data from Wise Old Man competitions (as events)
   * @param {Boolean} useAsMain - Whether to use WOM data as primary data source
   */
  const loadWomEvents = async (useAsMain = false) => {
    if (!groupChallengesService || !group) return;
    
    try {
      // Get group competition data from Wise Old Man
      const competitionsData = await groupChallengesService.getActiveChallenges(true);
      
      if (competitionsData && competitionsData.length > 0) {
        // Format competitions as calendar events
        const formattedEvents = competitionsData.map(comp => ({
          id: `wom-${comp.id}`,
          title: comp.title,
          description: comp.metric ? `Compete in ${comp.metric} metric` : 'WOM Competition',
          start: new Date(comp.startsAt),
          end: new Date(comp.endsAt),
          type: 'competition',
          participants: comp.participations?.map(p => p.player.username) || [],
          allDay: true,
          dataSource: DataSourceTypes.WISE_OLD_MAN
        }));
        
        // Update events state if we should use WOM as main data source
        if (useAsMain) {
          setEvents(formattedEvents);
          setDataSourceInfo(prev => ({
            ...prev,
            eventsDataSource: DataSourceTypes.WISE_OLD_MAN
          }));
        }
        
        // Update data source info
        setDataSourceInfo(prev => ({
          ...prev,
          lastWomSync: new Date()
        }));
      }
    } catch (err) {
      console.error('Error loading competitions from Wise Old Man:', err);
      if (useAsMain) {
        setError('Failed to load calendar events from all data sources. Please try again.');
      }
    }
  };
  
  /**
   * Enrich events with Wiki data
   * @param {Array} events - The events to enrich
   * @returns {Array} - The enriched events
   */
  const enrichEventsWithWikiData = async (events) => {
    if (!events || events.length === 0) {
      return events;
    }
    
    try {
      const enriched = await Promise.all(
        events.map(async (event) => {
          if (event.relatedEntity) {
            try {
              let wikiData = null;
              
              if (event.type === 'boss_event') {
                wikiData = await sharedCalendarService.getMonsterInfo(event.relatedEntity);
              } else if (event.type === 'skilling_event') {
                wikiData = await sharedCalendarService.getSkillInfo(event.relatedEntity);
              } else if (event.type === 'item_event') {
                wikiData = await sharedCalendarService.getItemInfo(event.relatedEntity);
              }
              
              if (wikiData) {
                // Update data source info
                setDataSourceInfo(prev => ({
                  ...prev,
                  entitiesDataSource: DataSourceTypes.WIKI,
                  lastWikiSync: new Date()
                }));
                
                return { ...event, wikiData };
              }
            } catch (error) {
              console.warn(`Could not enrich event ${event.title} with wiki data:`, error);
            }
          }
          return event;
        })
      );
      
      return enriched;
    } catch (err) {
      console.error('Error enriching events with wiki data:', err);
      return events;
    }
  };
  
  // Handle view date changes (when changing months/weeks)
  const handleDateChange = (arg) => {
    setCurrentViewInfo({
      start: arg.view.currentStart,
      end: arg.view.currentEnd,
      title: arg.view.title
    });
    
    // Load events for the new date range
    refreshEventsForDateRange(arg.view.currentStart, arg.view.currentEnd);
  };
  
  // Load events for a specific date range
  const refreshEventsForDateRange = async (startDate, endDate) => {
    if (!group?.id) return;
    
    try {
      const eventsData = await sharedCalendarService.getEventsInRange(startDate, endDate, true);
      const formattedEvents = sharedCalendarService.formatEventsForCalendar(eventsData);
      setEvents(formattedEvents);
    } catch (err) {
      console.error('Failed to load events for date range:', err);
      setError('Failed to load events for the selected date range.');
    }
  };
  
  // Handle date click in calendar
  const handleDateClick = (arg) => {
    setSelectedDate(arg.date);
    
    // Reset form data
    setEventForm({
      title: '',
      description: '',
      startDate: arg.dateStr,
      startTime: '12:00',
      endDate: arg.dateStr,
      endTime: '13:00',
      location: '',
      eventType: 'group_activity',
      allDay: false,
      participants: [],
      relatedChallengeId: '',
      color: '#3CB371' // Default to group activity color
    });
    
    setShowEventModal(true);
  };
  
  // Handle event click in calendar
  const handleEventClick = async (arg) => {
    const event = arg.event;
    
    try {
      // Get full event details if this is a challenge event
      let eventDetails = {
        id: event.id,
        title: event.title,
        description: event.extendedProps.description,
        startDate: event.start.toISOString().split('T')[0],
        endDate: event.end ? event.end.toISOString().split('T')[0] : event.start.toISOString().split('T')[0],
        startTime: event.start.toISOString().split('T')[1].substring(0, 5),
        endTime: event.end ? event.end.toISOString().split('T')[1].substring(0, 5) : '',
        location: event.extendedProps.location,
        eventType: event.extendedProps.type,
        allDay: event.allDay,
        participants: event.extendedProps.participants,
        relatedChallengeId: event.extendedProps.relatedChallengeId,
        color: event.backgroundColor,
        dataSource: event.extendedProps.dataSource
      };
      
      // If this is a challenge event, fetch the challenge details
      if (eventDetails.relatedChallengeId) {
        const challenge = await groupChallengesService.getChallengeDetails(eventDetails.relatedChallengeId);
        eventDetails.challengeDetails = challenge;
      }
      
      setSelectedEvent(eventDetails);
      setShowEventDetailsModal(true);
    } catch (err) {
      console.error('Failed to get event details:', err);
      setError('Failed to load event details. Please try again.');
    }
  };
  
  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setEventForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setEventForm(prev => ({ ...prev, [name]: value }));
      
      // Update color when event type changes
      if (name === 'eventType') {
        setEventForm(prev => ({ ...prev, color: EventTypeColors[value] || '#808080' }));
      }
    }
  };
  
  // Handle participant selection
  const handleParticipantChange = (memberId) => {
    setEventForm(prev => {
      const participants = [...prev.participants];
      
      if (participants.includes(memberId)) {
        return { ...prev, participants: participants.filter(id => id !== memberId) };
      } else {
        return { ...prev, participants: [...participants, memberId] };
      }
    });
  };
  
  // Create or update an event
  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!eventForm.title || !eventForm.startDate) {
      setError('Please provide at least an event title and start date.');
      return;
    }
    
    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        start_date: eventForm.allDay 
          ? eventForm.startDate 
          : `${eventForm.startDate}T${eventForm.startTime}:00`,
        end_date: eventForm.allDay 
          ? eventForm.endDate || eventForm.startDate 
          : `${eventForm.endDate || eventForm.startDate}T${eventForm.endTime}:00`,
        location: eventForm.location,
        event_type: eventForm.eventType,
        all_day: eventForm.allDay,
        participants: eventForm.participants,
        related_challenge_id: eventForm.relatedChallengeId || null,
        color: eventForm.color
      };
      
      // Create new event
      if (selectedEvent?.id) {
        // Update existing event
        await sharedCalendarService.updateEvent(selectedEvent.id, eventData);
      } else {
        // Create new event
        await sharedCalendarService.createEvent(eventData);
      }
      
      // Refresh calendar data
      await loadCalendarData();
      
      // Close modal
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to save event:', err);
      setError('Failed to save event. Please try again.');
    }
  };
  
  // Delete an event
  const handleDeleteEvent = async () => {
    if (!selectedEvent?.id) return;
    
    try {
      await sharedCalendarService.deleteEvent(selectedEvent.id);
      
      // Refresh calendar data
      await loadCalendarData();
      
      // Close modal
      setShowEventDetailsModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event. Please try again.');
    }
  };
  
  // Create an event from a challenge
  const handleCreateFromChallenge = async (challengeId) => {
    if (!challengeId) return;
    
    try {
      await sharedCalendarService.syncChallengeToCalendar(challengeId);
      
      // Refresh calendar data
      await loadCalendarData();
      
      // Close modal
      setShowEventModal(false);
    } catch (err) {
      console.error('Failed to create event from challenge:', err);
      setError('Failed to create event from challenge. Please try again.');
    }
  };
  
  // Edit an event from details view
  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    setEventForm({
      title: selectedEvent.title,
      description: selectedEvent.description,
      startDate: selectedEvent.startDate,
      startTime: selectedEvent.startTime,
      endDate: selectedEvent.endDate,
      endTime: selectedEvent.endTime,
      location: selectedEvent.location,
      eventType: selectedEvent.eventType,
      allDay: selectedEvent.allDay,
      participants: selectedEvent.participants || [],
      relatedChallengeId: selectedEvent.relatedChallengeId,
      color: selectedEvent.color
    });
    
    setShowEventDetailsModal(false);
    setShowEventModal(true);
  };
  
  // Render calendar tools
  const renderCalendarTools = () => {
    return (
      <div className="calendar-tools mb-3">
        <Row>
          <Col xs={12} md={6} className="mb-2 mb-md-0">
            <Button 
              variant="primary" 
              className="me-2" 
              onClick={() => calendarRef.current.getApi().today()}
            >
              Today
            </Button>
            <Button 
              variant="outline-secondary" 
              className="me-2" 
              onClick={() => calendarRef.current.getApi().prev()}
            >
              &lt;
            </Button>
            <Button 
              variant="outline-secondary" 
              className="me-2" 
              onClick={() => calendarRef.current.getApi().next()}
            >
              &gt;
            </Button>
            <span className="current-date-display">
              {currentViewInfo?.title || ''}
            </span>
          </Col>
          <Col xs={12} md={6} className="d-flex justify-content-md-end">
            <Button
              variant={calendarView === 'dayGridMonth' ? 'primary' : 'outline-primary'}
              className="me-2"
              onClick={() => {
                setCalendarView('dayGridMonth');
                calendarRef.current.getApi().changeView('dayGridMonth');
              }}
            >
              Month
            </Button>
            <Button
              variant={calendarView === 'timeGridWeek' ? 'primary' : 'outline-primary'}
              onClick={() => {
                setCalendarView('timeGridWeek');
                calendarRef.current.getApi().changeView('timeGridWeek');
              }}
            >
              Week
            </Button>
          </Col>
        </Row>
      </div>
    );
  };
  
  // Render event form modal
  const renderEventFormModal = () => {
    return (
      <Modal 
        show={showEventModal} 
        onHide={() => setShowEventModal(false)}
        size="lg"
        centered
        className="calendar-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedEvent?.id ? 'Edit Event' : 'Create New Event'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          
          <Form onSubmit={handleSubmitEvent}>
            <Form.Group className="mb-3">
              <Form.Label>Event Title*</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={eventForm.title}
                onChange={handleFormChange}
                required
                placeholder="Enter event title"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={eventForm.description}
                onChange={handleFormChange}
                placeholder="Enter event description"
              />
            </Form.Group>
            
            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date*</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={eventForm.startDate}
                    onChange={handleFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              {!eventForm.allDay && (
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control
                      type="time"
                      name="startTime"
                      value={eventForm.startTime}
                      onChange={handleFormChange}
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            
            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={eventForm.endDate}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
              {!eventForm.allDay && (
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Control
                      type="time"
                      name="endTime"
                      value={eventForm.endTime}
                      onChange={handleFormChange}
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="All Day Event"
                name="allDay"
                checked={eventForm.allDay}
                onChange={handleFormChange}
              />
            </Form.Group>
            
            <Row>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={eventForm.location}
                    onChange={handleFormChange}
                    placeholder="Enter location"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Event Type</Form.Label>
                  <Form.Select
                    name="eventType"
                    value={eventForm.eventType}
                    onChange={handleFormChange}
                  >
                    {EventTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Participants</Form.Label>
              <div className="member-checkboxes">
                {group?.members?.map(member => (
                  <Form.Check
                    key={member.id}
                    type="checkbox"
                    label={member.display_name}
                    checked={eventForm.participants.includes(member.id)}
                    onChange={() => handleParticipantChange(member.id)}
                  />
                ))}
              </div>
            </Form.Group>
            
            {challenges?.length > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Link to Challenge</Form.Label>
                <Form.Select
                  name="relatedChallengeId"
                  value={eventForm.relatedChallengeId}
                  onChange={handleFormChange}
                >
                  <option value="">None</option>
                  {challenges.map(challenge => (
                    <option key={challenge.id} value={challenge.id}>
                      {challenge.title}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            
            <div className="d-flex justify-content-end mt-4">
              <Button 
                variant="secondary" 
                className="me-2"
                onClick={() => setShowEventModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {selectedEvent?.id ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    );
  };
  
  // Render event details modal
  const renderEventDetailsModal = () => {
    if (!selectedEvent) return null;
    
    return (
      <Modal
        show={showEventDetailsModal}
        onHide={() => setShowEventDetailsModal(false)}
        size="lg"
        centered
        className="calendar-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div 
                className="event-color-dot" 
                style={{ 
                  backgroundColor: selectedEvent.color,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  marginRight: '8px'
                }}
              ></div>
              {selectedEvent.title}
              <DataSourceBadge badge={DataSourceBadges[selectedEvent.dataSource || dataSourceInfo.eventsDataSource]} />
            </Modal.Title>
          </Modal.Header>
        <Modal.Body>
          <div className="event-details-container">
            <Row className="mb-3">
              <Col xs={12} md={6}>
                <p className="event-meta">
                  <strong>Start:</strong> {new Date(selectedEvent.startDate + (selectedEvent.allDay ? '' : `T${selectedEvent.startTime}`)).toLocaleString()}
                </p>
              </Col>
              <Col xs={12} md={6}>
                <p className="event-meta">
                  <strong>End:</strong> {selectedEvent.endDate ? new Date(selectedEvent.endDate + (selectedEvent.allDay ? '' : `T${selectedEvent.endTime}`)).toLocaleString() : 'N/A'}
                </p>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col xs={12} md={6}>
                <p className="event-meta">
                  <strong>Type:</strong> {EventTypes.find(t => t.value === selectedEvent.eventType)?.label || selectedEvent.eventType}
                </p>
              </Col>
              <Col xs={12} md={6}>
                <p className="event-meta">
                  <strong>Location:</strong> {selectedEvent.location || 'N/A'}
                </p>
              </Col>
            </Row>
            
            {selectedEvent.description && (
              <div className="mb-3">
                <h5>Description</h5>
                <p className="event-description">{selectedEvent.description}</p>
              </div>
            )}
            
            {selectedEvent.participants?.length > 0 && (
              <div className="mb-3">
                <h5>Participants</h5>
                <div className="participant-badges">
                  {selectedEvent.participants.map(participantId => {
                    const member = group?.members?.find(m => m.id === participantId);
                    return (
                      <Badge 
                        key={participantId}
                        bg="secondary" 
                        className="me-2 mb-2 participant-badge"
                      >
                        {member?.display_name || 'Unknown Member'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            
            {selectedEvent.challengeDetails && (
              <div className="linked-challenge mb-3">
                <h5>Linked Challenge</h5>
                <Card className="linked-challenge-card">
                  <Card.Body>
                    <Card.Title>{selectedEvent.challengeDetails.title}</Card.Title>
                    <Card.Text>{selectedEvent.challengeDetails.description}</Card.Text>
                    <div className="progress mb-2">
                      <div 
                        className="progress-bar" 
                        role="progressbar"
                        style={{ 
                          width: `${(selectedEvent.challengeDetails.current_value / selectedEvent.challengeDetails.target) * 100}%`
                        }}
                        aria-valuenow={selectedEvent.challengeDetails.current_value}
                        aria-valuemin="0"
                        aria-valuemax={selectedEvent.challengeDetails.target}
                      >
                        {Math.round((selectedEvent.challengeDetails.current_value / selectedEvent.challengeDetails.target) * 100)}%
                      </div>
                    </div>
                    <p className="challenge-progress-text">
                      {selectedEvent.challengeDetails.current_value} / {selectedEvent.challengeDetails.target} {selectedEvent.challengeDetails.metric}
                    </p>
                  </Card.Body>
                </Card>
              </div>
            )}
            
            {selectedEvent.wikiData && (
              <div className="wiki-data-panel">
                <h5 className="d-flex align-items-center">
                  Wiki Information 
                  <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WIKI]} small className="ms-2" />
                </h5>
                <div className="wiki-content">
                  {selectedEvent.wikiData.name && (
                    <div className="wiki-name mb-2">{selectedEvent.wikiData.name}</div>
                  )}
                  
                  {selectedEvent.wikiData.description && (
                    <p className="wiki-description">{selectedEvent.wikiData.description}</p>
                  )}
                  
                  {selectedEvent.wikiData.properties && (
                    <div className="wiki-properties">
                      <small className="text-muted">Properties:</small>
                      <Table size="sm" bordered className="mt-1">
                        <tbody>
                          {Object.entries(selectedEvent.wikiData.properties).map(([key, value]) => (
                            <tr key={key}>
                              <th>{key}</th>
                              <td>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-danger" 
            className="me-auto"
            onClick={handleDeleteEvent}
          >
            Delete
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowEventDetailsModal(false)}
          >
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEditEvent}
          >
            Edit
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  
  // Render data sources panel
  const renderDataSourcesPanel = () => {
    const sources = [
      {
        name: 'Plugin',
        connected: dataSourceInfo.lastPluginSync !== null,
        lastUpdateTime: dataSourceInfo.lastPluginSync
      },
      {
        name: 'Wise Old Man',
        connected: dataSourceInfo.lastWomSync !== null,
        lastUpdateTime: dataSourceInfo.lastWomSync
      },
      {
        name: 'Wiki',
        connected: dataSourceInfo.lastWikiSync !== null,
        lastUpdateTime: dataSourceInfo.lastWikiSync
      }
    ];
    
    return (
      <div className="data-sources-panel">
        <h6>Data Sources</h6>
        <div className="data-sources-list">
          {sources.map(source => (
            <div key={source.name} className="data-source-item">
              <div className="data-source-name">{source.name}</div>
              <div className="data-source-status">
                {source.connected ? (
                  <Badge bg="success">Connected</Badge>
                ) : (
                  <Badge bg="danger">Disconnected</Badge>
                )}
              </div>
              <div className="data-source-last-update">
                {source.lastUpdateTime && (
                  <small>Last updated: {new Date(source.lastUpdateTime).toLocaleString()}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="shared-calendar-panel">
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h3 className="panel-title">Group Calendar</h3>
          <div>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => {
                loadCalendarData();
                performSync(false);
              }}
              disabled={loading || syncState.syncInProgress}
              className="me-2"
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
              {syncState.syncInProgress && (
                <Spinner animation="border" size="sm" className="ms-1" />
              )}
            </Button>
            <Button 
              variant="success" 
              size="sm"
              onClick={() => {
                setSelectedEvent(null);
                setEventForm({
                  title: '',
                  description: '',
                  startDate: new Date().toISOString().split('T')[0],
                  startTime: '12:00',
                  endDate: new Date().toISOString().split('T')[0],
                  endTime: '13:00',
                  location: '',
                  eventType: 'group_activity',
                  allDay: false,
                  participants: [],
                  relatedChallengeId: '',
                  color: EventTypeColors['group_activity']
                });
                setShowEventModal(true);
              }}
            >
              Create Event
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}
          
          {renderCalendarTools()}
          
          <div className="calendar-container">
            {loading ? (
              <div className="text-center p-5">
                <Spinner animation="border" role="status" className="osrs-spinner">
                  <span className="visually-hidden">Loading calendar...</span>
                </Spinner>
                <p className="mt-2">Loading calendar...</p>
              </div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={false} // We're using custom header
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                datesSet={handleDateChange}
                height="auto"
                aspectRatio={1.35}
                editable={false}
              />
            )}
          </div>
          
          <div className="event-legend mt-4">
            <h6>Event Types</h6>
            <div className="d-flex flex-wrap">
              {EventTypes.map(type => (
                <div key={type.value} className="event-type-legend me-3 mb-2">
                  <div 
                    className="color-dot"
                    style={{ 
                      backgroundColor: EventTypeColors[type.value],
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      display: 'inline-block',
                      marginRight: '5px'
                    }}
                  ></div>
                  {type.label}
                </div>
              ))}
            </div>
          </div>
          
          {renderDataSourcesPanel()}
        </Card.Body>
      </Card>
      
      {renderEventFormModal()}
      {renderEventDetailsModal()}
    </div>
  );
};

export default SharedCalendarPanel;
