import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Table, Form, Row, Col, Alert, Spinner, Badge, Modal, ProgressBar, Tabs, Tab } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext';
import { useSync } from '../../contexts/SyncContext';
import groupChallengesService from './group-challenges-service';
import './GroupChallengesPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * GroupChallengesPanel Component
 * Displays group challenges with the ability to view, create, and track progress
 * Integrates data from multiple sources: Plugin, Wise Old Man, and Wiki
 */
const GroupChallengesPanel = () => {
  const { group } = useContext(GroupContext);
  const { syncState, performSync, wikiService, wikiState, womState, wiseOldManService } = useSync();
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [challengeTypes, setChallengeTypes] = useState([]);
  
  // Data source tracking
  const [womChallenges, setWomChallenges] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    challengesDataSource: DataSourceTypes.PLUGIN,
    entitiesDataSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
  });
  
  // Form state for creating/editing challenges
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challengeType: '',
    target: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // One week from now
    trackingMetric: 'count', // count, experience, time, etc.
    participants: []
  });

  // Load challenges on component mount
  useEffect(() => {
    loadChallenges();
    loadChallengeTypes();
    
    // Trigger sync when component mounts
    if (!syncState.syncInProgress) {
      performSync(false); // Background sync
    }
  }, [group]);

  // Also reload challenges when syncState changes (when data is refreshed)
  useEffect(() => {
    if (syncState.lastSyncTime && !syncState.syncInProgress) {
      loadChallenges();
    }
  }, [syncState.lastSyncTime]);

  // Load challenges from the service
  const loadChallenges = async () => {
    if (!group) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from plugin first
      const { active, completed } = await groupChallengesService.getChallenges(group.id);
      
      // Enrich challenges with wiki data where applicable
      const enrichedActive = await enrichChallengesWithWikiData(active);
      
      setActiveChallenges(enrichedActive);
      setCompletedChallenges(completed);
      
      // Update data source info
      setDataSourceInfo(prev => ({
        ...prev,
        challengesDataSource: DataSourceTypes.PLUGIN,
        lastPluginSync: new Date()
      }));
      
      // Even if plugin data is available, also try to load WOM data as backup
      loadWomChallenges();
    } catch (err) {
      console.error('Error loading challenges from plugin:', err);
      
      // Try to load from Wise Old Man if plugin fails
      loadWomChallenges(true);
      
      if (!womChallenges) {
        setError('Failed to load challenges. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load challenge data from Wise Old Man
   * @param {Boolean} useAsMain - Whether to use WOM data as primary data source
   */
  const loadWomChallenges = async (useAsMain = false) => {
    if (!wiseOldManService || !group) return;
    
    try {
      // Get group competition data from Wise Old Man
      const competitionsData = await wiseOldManService.getGroupCompetitions(group.name);
      
      if (competitionsData && competitionsData.length > 0) {
        // Format competitions as challenges
        const formattedChallenges = competitionsData.map(comp => ({
          id: `wom-${comp.id}`,
          title: comp.title,
          description: comp.metric ? `Compete in ${comp.metric} metric` : 'WOM Competition',
          challengeType: 'wom_competition',
          progress: comp.participations?.map(p => ({
            playerName: p.player.username,
            progress: p.progress.gained,
            target: comp.group ? 'Group' : 'Individual'
          })) || [],
          startDate: comp.startsAt,
          endDate: comp.endsAt,
          status: new Date() > new Date(comp.endsAt) ? 'completed' : 'active',
          dataSource: DataSourceTypes.WISE_OLD_MAN
        }));
        
        // Split into active and completed
        const active = formattedChallenges.filter(c => c.status === 'active');
        const completed = formattedChallenges.filter(c => c.status === 'completed');
        
        setWomChallenges({ active, completed });
        
        // Update data source info
        setDataSourceInfo(prev => ({
          ...prev,
          lastWomSync: new Date()
        }));
        
        // If we should use WOM as main data source, update the state
        if (useAsMain) {
          setActiveChallenges(active);
          setCompletedChallenges(completed);
          setDataSourceInfo(prev => ({
            ...prev,
            challengesDataSource: DataSourceTypes.WISE_OLD_MAN
          }));
        }
      }
    } catch (err) {
      console.error('Error loading competitions from Wise Old Man:', err);
      if (useAsMain) {
        setError('Failed to load challenges from all data sources. Please try again.');
      }
    }
  };
  
  /**
   * Enrich challenges with Wiki data
   * @param {Array} challenges - The challenges to enrich
   * @returns {Array} - The enriched challenges
   */
  const enrichChallengesWithWikiData = async (challenges) => {
    if (!wikiService || !challenges || challenges.length === 0) {
      return challenges;
    }
    
    try {
      const enriched = await Promise.all(
        challenges.map(async (challenge) => {
          if (challenge.wikiInfoRequired && challenge.targetEntity) {
            try {
              // Try to enrich with wiki data for bosses, items, etc.
              let wikiData = null;
              
              if (challenge.challengeType === 'boss_kill') {
                wikiData = await wikiService.getMonsterInfo(challenge.targetEntity);
              } else if (challenge.challengeType === 'item_collection') {
                wikiData = await wikiService.getItemInfo(challenge.targetEntity);
              } else if (challenge.challengeType === 'skill_level') {
                wikiData = await wikiService.getSkillInfo(challenge.targetEntity);
              }
              
              if (wikiData) {
                // Update data source info
                setDataSourceInfo(prev => ({
                  ...prev,
                  entitiesDataSource: DataSourceTypes.WIKI,
                  lastWikiSync: new Date()
                }));
                
                return { ...challenge, wikiData };
              }
            } catch (error) {
              console.warn('Could not enrich challenge with wiki data:', error);
            }
          }
          return challenge;
        })
      );
      
      return enriched;
    } catch (err) {
      console.error('Error enriching challenges with wiki data:', err);
      return challenges;
    }
  };

  // Load challenge types
  const loadChallengeTypes = async () => {
    try {
      const types = await groupChallengesService.getChallengeTypes();
      setChallengeTypes(types);
    } catch (err) {
      console.error('Error loading challenge types:', err);
    }
  };

  // Handle opening the challenge details modal
  const handleViewChallengeDetails = async (challenge) => {
    setCurrentChallenge(challenge);
    
    try {
      let details;
      
      // Handle different data sources
      if (challenge.dataSource === DataSourceTypes.WISE_OLD_MAN) {
        // For WOM challenges, format the details differently
        details = {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          progress: challenge.progress,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          status: challenge.status,
          participants: challenge.progress.map(p => p.playerName),
          dataSource: DataSourceTypes.WISE_OLD_MAN
        };
      } else {
        // For plugin challenges, get details from the service
        details = await groupChallengesService.getChallengeDetails(challenge.id);
        
        // If the challenge involves entities that could benefit from wiki data, enrich it
        if (details.relatedEntities && details.relatedEntities.length > 0) {
          details.relatedEntities = await enrichEntitiesWithWikiData(details.relatedEntities);
        }
      }
      
      setChallengeDetails(details);
    } catch (err) {
      console.error('Error loading challenge details:', err);
      setChallengeDetails(null);
    }
    
    setShowDetailsModal(true);
  };
  
  /**
   * Enrich entities with Wiki data
   * @param {Array} entities - The entities to enrich
   * @returns {Array} - The enriched entities
   */
  const enrichEntitiesWithWikiData = async (entities) => {
    if (!wikiService || !entities || entities.length === 0) {
      return entities;
    }
    
    try {
      const enriched = await Promise.all(
        entities.map(async (entity) => {
          try {
            let wikiData = null;
            
            if (entity.type === 'monster' || entity.type === 'boss') {
              wikiData = await wikiService.getMonsterInfo(entity.name);
            } else if (entity.type === 'item') {
              wikiData = await wikiService.getItemInfo(entity.name);
            } else if (entity.type === 'skill') {
              wikiData = await wikiService.getSkillInfo(entity.name);
            }
            
            if (wikiData) {
              // Update wiki data source info
              setDataSourceInfo(prev => ({
                ...prev,
                entitiesDataSource: DataSourceTypes.WIKI,
                lastWikiSync: new Date()
              }));
              
              return { ...entity, wikiData };
            }
          } catch (error) {
            console.warn(`Could not enrich entity ${entity.name} with wiki data:`, error);
          }
          return entity;
        })
      );
      
      return enriched;
    } catch (err) {
      console.error('Error enriching entities with wiki data:', err);
      return entities;
    }
  };

  // Render data sources panel
  const renderDataSourcesPanel = () => {
    const sources = getDataSourcesStatus(
      {
        ...syncState,
        lastSyncSuccess: activeChallenges.length > 0 && dataSourceInfo.challengesDataSource === DataSourceTypes.PLUGIN
      },
      {
        connected: dataSourceInfo.lastWikiSync !== null,
        lastUpdateTime: dataSourceInfo.lastWikiSync
      },
      {
        lastSuccess: womChallenges !== null,
        lastUpdateTime: dataSourceInfo.lastWomSync
      }
    );
    
    return <DataSourcesPanel sources={sources} />;
  };

  return (
    <Card className="group-challenges-panel">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5>
            <i className="bi bi-trophy me-2"></i>
            Group Challenges
          </h5>
          <div>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => performSync(true)} 
              disabled={syncState.syncInProgress}
              className="me-2"
            >
              {syncState.syncInProgress ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Syncing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat me-1"></i>
                  Sync Data
                </>
              )}
            </Button>
            <Button 
              variant="success" 
              size="sm" 
              onClick={() => setShowCreateForm(true)}
            >
              <i className="bi bi-plus-circle me-1"></i>
              New Challenge
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger">{error}</Alert>
        )}

        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" />
            <p className="mt-2">Loading challenge data...</p>
          </div>
        ) : (
          <>
            <Tabs defaultActiveKey="active" className="mb-4">
              <Tab eventKey="active" title="Active Challenges">
                {activeChallenges.length > 0 ? (
                  <div className="challenges-grid">
                    {activeChallenges.map((challenge) => (
                      <Card key={challenge.id} className="challenge-card">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <span className="challenge-title">{challenge.title}</span>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getChallengeTypeBadge(challenge.challengeType)} 
                              className="me-2"
                            >
                              {challenge.challengeType === 'wom_competition' ? 'WOM' : getChallengeTypeLabel(challenge.challengeType, challengeTypes)}
                            </Badge>
                            {/* Data source badge */}
                            <DataSourceBadge 
                              badge={DataSourceBadges[challenge.dataSource || dataSourceInfo.challengesDataSource]} 
                              small
                            />
                          </div>
                        </Card.Header>
                        <Card.Body>
                          <p>{challenge.description}</p>
                          
                          {challenge.progress && challenge.target && (
                            <div className="mb-3">
                              <div className="d-flex justify-content-between mb-1">
                                <small>Progress</small>
                                <small>{challenge.progress} / {challenge.target}</small>
                              </div>
                              <ProgressBar 
                                now={Math.min(100, (challenge.progress / challenge.target) * 100)} 
                                label={`${Math.round((challenge.progress / challenge.target) * 100)}%`}
                              />
                            </div>
                          )}
                          
                          <div className="challenge-dates">
                            <div>
                              <small>Start Date:</small>
                              <div>{new Date(challenge.startDate).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <small>End Date:</small>
                              <div>{new Date(challenge.endDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                          
                          {challenge.wikiData && (
                            <div className="wiki-data-reference mt-2">
                              <small>
                                <i className="bi bi-info-circle me-1"></i>
                                Wiki data available
                                <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WIKI]} small />
                              </small>
                            </div>
                          )}
                        </Card.Body>
                        <Card.Footer>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleViewChallengeDetails(challenge)}
                          >
                            View Details
                          </Button>
                        </Card.Footer>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert variant="info">
                    No active challenges found. Create a new challenge to get started!
                  </Alert>
                )}
              </Tab>
              
              <Tab eventKey="completed" title="Completed Challenges">
                {completedChallenges.length > 0 ? (
                  <div className="challenges-grid">
                    {completedChallenges.map((challenge) => (
                      <Card key={challenge.id} className="challenge-card completed">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                          <span className="challenge-title">{challenge.title}</span>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getChallengeTypeBadge(challenge.challengeType)} 
                              className="me-2"
                            >
                              {challenge.challengeType === 'wom_competition' ? 'WOM' : getChallengeTypeLabel(challenge.challengeType, challengeTypes)}
                            </Badge>
                            {/* Data source badge */}
                            <DataSourceBadge 
                              badge={DataSourceBadges[challenge.dataSource || dataSourceInfo.challengesDataSource]} 
                              small
                            />
                          </div>
                        </Card.Header>
                        <Card.Body>
                          <p>{challenge.description}</p>
                          
                          <Badge bg="success" className="mb-3">Completed</Badge>
                          
                          <div className="challenge-dates">
                            <div>
                              <small>Start Date:</small>
                              <div>{new Date(challenge.startDate).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <small>Completed:</small>
                              <div>{new Date(challenge.completedDate || challenge.endDate).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </Card.Body>
                        <Card.Footer>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleViewChallengeDetails(challenge)}
                          >
                            View Results
                          </Button>
                        </Card.Footer>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert variant="info">
                    No completed challenges found.
                  </Alert>
                )}
              </Tab>
            </Tabs>

            {/* Data Sources Panel */}
            {renderDataSourcesPanel()}
            
            {/* Challenge creation form */}
            {showCreateForm && (
              <Card className="mt-4">
                <Card.Header>
                  <h5 className="mb-0">Create New Challenge</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmitChallenge}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Title</Form.Label>
                          <Form.Control
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleFormChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Challenge Type</Form.Label>
                          <Form.Select
                            name="challengeType"
                            value={formData.challengeType}
                            onChange={handleFormChange}
                            required
                          >
                            <option value="">Select Challenge Type</option>
                            {challengeTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={formData.description}
                        onChange={handleFormChange}
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Target Value</Form.Label>
                          <Form.Control
                            type="number"
                            name="target"
                            value={formData.target}
                            onChange={handleFormChange}
                            required
                            min="1"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Tracking Metric</Form.Label>
                          <Form.Select
                            name="trackingMetric"
                            value={formData.trackingMetric}
                            onChange={handleFormChange}
                          >
                            <option value="count">Count</option>
                            <option value="experience">Experience</option>
                            <option value="level">Level</option>
                            <option value="time">Time (minutes)</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Start Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleFormChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>End Date</Form.Label>
                          <Form.Control
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleFormChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Participants</Form.Label>
                      <div className="participant-checkboxes">
                        {group?.members?.map((member) => (
                          <Form.Check
                            key={member.id}
                            type="checkbox"
                            id={`participant-${member.id}`}
                            label={member.name}
                            name="participant"
                            checked={formData.participants.includes(member.id)}
                            onChange={handleFormChange}
                          />
                        ))}
                      </div>
                    </Form.Group>
                    
                    <div className="d-flex gap-2 mt-4">
                      <Button 
                        variant="primary" 
                        type="submit"
                      >
                        Create Challenge
                      </Button>
                      <Button 
                        variant="outline-secondary"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Card.Body>
      
      {/* Challenge Details Modal */}
      {showDetailsModal && challengeDetails && (
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {challengeDetails.title}
              {/* Data source badge */}
              <DataSourceBadge 
                badge={DataSourceBadges[challengeDetails.dataSource || dataSourceInfo.challengesDataSource]} 
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{challengeDetails.description}</p>
            
            <div className="d-flex justify-content-between mb-4">
              <div>
                <strong>Start Date:</strong> {new Date(challengeDetails.startDate).toLocaleDateString()}
              </div>
              <div>
                <strong>End Date:</strong> {new Date(challengeDetails.endDate).toLocaleDateString()}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <Badge bg={challengeDetails.status === 'active' ? 'primary' : 'success'}>
                  {challengeDetails.status === 'active' ? 'Active' : 'Completed'}
                </Badge>
              </div>
            </div>
            
            {challengeDetails.relatedEntities && challengeDetails.relatedEntities.length > 0 && (
              <div className="mb-4">
                <h6>Related Entities</h6>
                <div className="d-flex flex-wrap gap-3">
                  {challengeDetails.relatedEntities.map((entity, index) => (
                    <div key={index} className="entity-card">
                      <div className="entity-title">
                        {entity.name}
                        <Badge bg="secondary" className="ms-2">{entity.type}</Badge>
                      </div>
                      
                      {entity.wikiData && (
                        <div className="entity-wiki-data">
                          <small className="d-flex align-items-center">
                            Wiki info available
                            <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WIKI]} small className="ms-1" />
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <h6>Participants</h6>
            <Row className="mb-4">
              {challengeDetails.participants?.map((participant, index) => (
                <Col key={index} md={4} className="mb-2">
                  <div className="participant-item">
                    <i className="bi bi-person-circle me-2"></i>
                    {participant}
                  </div>
                </Col>
              ))}
            </Row>
            
            <h6>Progress Tracking</h6>
            {challengeDetails.progress ? (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Progress</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(challengeDetails.progress) ? 
                    challengeDetails.progress.map((progressItem, index) => (
                      <tr key={index}>
                        <td>{progressItem.playerName}</td>
                        <td>{progressItem.progress.toLocaleString()}</td>
                        <td>{challengeDetails.target || progressItem.target || 'N/A'}</td>
                        <td>
                          {progressItem.status || (
                            <ProgressBar 
                              now={Math.min(100, ((progressItem.progress || 0) / (challengeDetails.target || 100)) * 100)} 
                              label={`${Math.round(((progressItem.progress || 0) / (challengeDetails.target || 100)) * 100)}%`}
                            />
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="text-center">No progress data available</td>
                      </tr>
                    )
                  }
                </tbody>
              </Table>
            ) : (
              <Alert variant="info">No progress data available for this challenge.</Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Card>
  );
};

export default GroupChallengesPanel;
