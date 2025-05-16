import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Table, Form, Row, Col, Alert, Spinner, Badge, Modal, Tabs, Tab } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext';
import { useSync } from '../../contexts/SyncContext';
import activitiesService from './activities-service';
import './ActivitiesPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * ActivitiesPanel Component 
 * Displays group member activities with integration from multiple data sources (plugin, WOM, Wiki)
 */
const ActivitiesPanel = () => {
  const { group } = useContext(GroupContext);
  const { syncState, performSync, wikiService, wikiState, womState, wiseOldManService } = useSync();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activityCategories, setActivityCategories] = useState([]);
  
  // Data source tracking
  const [womActivities, setWomActivities] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    activitiesDataSource: DataSourceTypes.PLUGIN,
    entitiesDataSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
  });

  // Load activities on component mount
  useEffect(() => {
    loadActivities();
    
    // Trigger sync when component mounts
    if (!syncState.syncInProgress) {
      performSync(false); // Background sync
    }
  }, [group]);

  // Also reload activities when syncState changes (when data is refreshed)
  useEffect(() => {
    if (syncState.lastSyncTime && !syncState.syncInProgress) {
      loadActivities();
    }
  }, [syncState.lastSyncTime]);

  // Apply member and category filters
  useEffect(() => {
    applyFilters();
  }, [activities, selectedMember, selectedCategory]);

  // Load activities from the service
  const loadActivities = async () => {
    if (!group) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from plugin first
      const result = await activitiesService.getGroupActivities(group.id);
      
      // Extract unique categories for filter dropdown
      const categories = [...new Set(result.map(activity => activity.category))];
      setActivityCategories(categories);
      
      // Enrich activities with wiki data where applicable
      const enrichedActivities = await enrichActivitiesWithWikiData(result);
      
      setActivities(enrichedActivities);
      
      // Update data source info
      setDataSourceInfo(prev => ({
        ...prev,
        activitiesDataSource: DataSourceTypes.PLUGIN,
        lastPluginSync: new Date()
      }));
      
      // Even if plugin data is available, also try to load WOM data as backup
      loadWomActivities();
    } catch (err) {
      console.error('Error loading activities from plugin:', err);
      
      // Try to load from Wise Old Man if plugin fails
      loadWomActivities(true);
      
      if (!womActivities) {
        setError('Failed to load activities. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Load activity data from Wise Old Man
   * @param {Boolean} useAsMain - Whether to use WOM data as primary data source
   */
  const loadWomActivities = async (useAsMain = false) => {
    if (!wiseOldManService || !group) return;
    
    try {
      // Get group members activities data from Wise Old Man
      const activitiesData = await Promise.all(
        group.members.map(async (member) => {
          try {
            const playerActivities = await wiseOldManService.getPlayerActivities(member.name);
            return playerActivities.map(activity => ({
              ...activity,
              playerName: member.name,
              category: mapWomActivityTypeToCategory(activity.type),
              timestamp: new Date(activity.createdAt).getTime(),
              formattedDate: new Date(activity.createdAt).toLocaleDateString(),
              dataSource: DataSourceTypes.WISE_OLD_MAN
            }));
          } catch (err) {
            console.warn(`Could not fetch activities for ${member.name} from WOM:`, err);
            return [];
          }
        })
      );
      
      // Flatten and sort by timestamp (newest first)
      const combinedActivities = activitiesData
        .flat()
        .filter(activity => activity) // Remove any null/undefined
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setWomActivities(combinedActivities);
      
      // Update data source info
      setDataSourceInfo(prev => ({
        ...prev,
        lastWomSync: new Date()
      }));
      
      // If we should use WOM as main data source, update the state
      if (useAsMain) {
        setActivities(combinedActivities);
        setDataSourceInfo(prev => ({
          ...prev,
          activitiesDataSource: DataSourceTypes.WISE_OLD_MAN
        }));
        
        // Extract unique categories
        const womCategories = [...new Set(combinedActivities.map(activity => activity.category))];
        setActivityCategories(womCategories);
      }
    } catch (err) {
      console.error('Error loading activities from Wise Old Man:', err);
      if (useAsMain) {
        setError('Failed to load activities from all data sources. Please try again.');
      }
    }
  };
  
  /**
   * Maps Wise Old Man activity type to our internal category
   * @param {String} womType - The WOM activity type
   * @returns {String} - The mapped category
   */
  const mapWomActivityTypeToCategory = (womType) => {
    const categoryMap = {
      'gained_experience': 'skill',
      'level_up': 'skill',
      'achievement': 'achievement',
      'boss_kill': 'boss',
      'activity_finished': 'activity',
      'player_name_changed': 'other'
    };
    
    return categoryMap[womType] || 'other';
  };
  
  /**
   * Enrich activities with Wiki data
   * @param {Array} activities - The activities to enrich
   * @returns {Array} - The enriched activities
   */
  const enrichActivitiesWithWikiData = async (activities) => {
    if (!wikiService || !activities || activities.length === 0) {
      return activities;
    }
    
    try {
      const enriched = await Promise.all(
        activities.map(async (activity) => {
          if (activity.relatedEntity) {
            try {
              let wikiData = null;
              
              if (activity.category === 'skill') {
                wikiData = await wikiService.getSkillInfo(activity.relatedEntity);
              } else if (activity.category === 'boss' || activity.category === 'monster') {
                wikiData = await wikiService.getMonsterInfo(activity.relatedEntity);
              } else if (activity.category === 'item') {
                wikiData = await wikiService.getItemInfo(activity.relatedEntity);
              }
              
              if (wikiData) {
                // Update data source info
                setDataSourceInfo(prev => ({
                  ...prev,
                  entitiesDataSource: DataSourceTypes.WIKI,
                  lastWikiSync: new Date()
                }));
                
                return { ...activity, wikiData };
              }
            } catch (error) {
              console.warn(`Could not enrich activity for ${activity.relatedEntity} with wiki data:`, error);
            }
          }
          return activity;
        })
      );
      
      return enriched;
    } catch (err) {
      console.error('Error enriching activities with wiki data:', err);
      return activities;
    }
  };

  // Apply filters to the activities
  const applyFilters = () => {
    let filtered = [...activities];
    
    // Apply member filter
    if (selectedMember !== 'all') {
      filtered = filtered.filter(activity => activity.playerName === selectedMember);
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(activity => activity.category === selectedCategory);
    }
    
    setFilteredActivities(filtered);
  };

  // Handle changing the member filter
  const handleMemberFilterChange = (e) => {
    setSelectedMember(e.target.value);
  };

  // Handle changing the category filter
  const handleCategoryFilterChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  // View details for a specific activity
  const handleViewActivityDetails = (activity) => {
    setCurrentActivity(activity);
    setShowActivityDetails(true);
  };

  // Get badge color based on activity category
  const getCategoryBadgeVariant = (category) => {
    const categoryColors = {
      skill: 'primary',
      boss: 'danger',
      monster: 'warning',
      item: 'success',
      achievement: 'info',
      quest: 'secondary',
      activity: 'dark',
      other: 'light'
    };
    
    return categoryColors[category] || 'secondary';
  };
  
  // Render data sources panel
  const renderDataSourcesPanel = () => {
    const sources = getDataSourcesStatus(
      {
        ...syncState,
        lastSyncSuccess: activities.length > 0 && dataSourceInfo.activitiesDataSource === DataSourceTypes.PLUGIN
      },
      {
        connected: dataSourceInfo.lastWikiSync !== null,
        lastUpdateTime: dataSourceInfo.lastWikiSync
      },
      {
        lastSuccess: womActivities !== null,
        lastUpdateTime: dataSourceInfo.lastWomSync
      }
    );
    
    return <DataSourcesPanel sources={sources} />;
  };

  return (
    <Card className="activities-panel">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5>
            <i className="bi bi-activity me-2"></i>
            Group Activities
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
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger">{error}</Alert>
        )}
        
        {/* Filters */}
        <div className="filters mb-4">
          <Row>
            <Col md={6} lg={4}>
              <Form.Group>
                <Form.Label>Filter by Member</Form.Label>
                <Form.Select 
                  value={selectedMember} 
                  onChange={handleMemberFilterChange}
                >
                  <option value="all">All Members</option>
                  {group?.members?.map(member => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} lg={4}>
              <Form.Group>
                <Form.Label>Filter by Category</Form.Label>
                <Form.Select 
                  value={selectedCategory} 
                  onChange={handleCategoryFilterChange}
                >
                  <option value="all">All Categories</option>
                  {activityCategories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" />
            <p className="mt-2">Loading activities data...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <Alert variant="info">
            No activities found for the selected filters.
          </Alert>
        ) : (
          <div className="activities-list">
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Activity</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity, index) => (
                  <tr key={index}>
                    <td>{activity.formattedDate || new Date(activity.timestamp).toLocaleDateString()}</td>
                    <td>
                      <span className="member-name">
                        <i className="bi bi-person-circle me-1"></i>
                        {activity.playerName}
                      </span>
                    </td>
                    <td>{activity.description}</td>
                    <td>
                      <Badge bg={getCategoryBadgeVariant(activity.category)}>
                        {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                      </Badge>
                    </td>
                    <td>
                      <DataSourceBadge 
                        badge={DataSourceBadges[activity.dataSource || dataSourceInfo.activitiesDataSource]} 
                        small 
                      />
                    </td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => handleViewActivityDetails(activity)}
                      >
                        <i className="bi bi-info-circle me-1"></i>
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        
        {/* Data Sources Panel */}
        {renderDataSourcesPanel()}
      </Card.Body>

      {/* Activity Details Modal */}
      {showActivityDetails && currentActivity && (
        <Modal 
          show={showActivityDetails} 
          onHide={() => setShowActivityDetails(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Activity Details
              <DataSourceBadge 
                badge={DataSourceBadges[currentActivity.dataSource || dataSourceInfo.activitiesDataSource]} 
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={8}>
                <div className="mb-3">
                  <h5 className="activity-title">{currentActivity.description}</h5>
                  <div className="activity-meta">
                    <div>
                      <strong>Member:</strong> {currentActivity.playerName}
                    </div>
                    <div>
                      <strong>Date:</strong> {currentActivity.formattedDate || new Date(currentActivity.timestamp).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Category:</strong>{' '}
                      <Badge bg={getCategoryBadgeVariant(currentActivity.category)}>
                        {currentActivity.category.charAt(0).toUpperCase() + currentActivity.category.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {currentActivity.details && (
                  <div className="activity-details mb-3">
                    <h6>Additional Details</h6>
                    <Table bordered size="sm">
                      <tbody>
                        {Object.entries(currentActivity.details).map(([key, value]) => (
                          <tr key={key}>
                            <th>{key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</th>
                            <td>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
                
                {currentActivity.relatedActivities && currentActivity.relatedActivities.length > 0 && (
                  <div className="related-activities mb-3">
                    <h6>Related Activities</h6>
                    <ul className="list-group">
                      {currentActivity.relatedActivities.map((related, idx) => (
                        <li key={idx} className="list-group-item">
                          {related.description} ({new Date(related.timestamp).toLocaleDateString()})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Col>
              
              <Col md={4}>
                {/* Wiki Data Panel */}
                {currentActivity.wikiData && (
                  <div className="wiki-data-panel">
                    <h6 className="d-flex align-items-center">
                      Wiki Information 
                      <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WIKI]} small className="ms-2" />
                    </h6>
                    <div className="wiki-content">
                      {currentActivity.wikiData.name && (
                        <div className="wiki-name mb-2">{currentActivity.wikiData.name}</div>
                      )}
                      
                      {currentActivity.wikiData.description && (
                        <p className="wiki-description">{currentActivity.wikiData.description}</p>
                      )}
                      
                      {currentActivity.wikiData.properties && (
                        <div className="wiki-properties">
                          <small className="text-muted">Properties:</small>
                          <Table size="sm" bordered className="mt-1">
                            <tbody>
                              {Object.entries(currentActivity.wikiData.properties).map(([key, value]) => (
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
                
                {/* Additional Meta Panel */}
                {currentActivity.metaInfo && (
                  <div className="meta-info-panel mt-3">
                    <h6>Meta Information</h6>
                    <ul className="list-group">
                      {Object.entries(currentActivity.metaInfo).map(([key, value]) => (
                        <li key={key} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                          <span>{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowActivityDetails(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Card>
  );
};

export default ActivitiesPanel;
