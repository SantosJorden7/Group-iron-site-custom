import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Table, Tabs, Tab, Badge, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext.js';
import { useSync } from '../../contexts/SyncContext.js';
import * as slayerTaskService from './slayer-task-service';
import './SlayerTaskPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * SlayerTaskPanel Component
 * Displays slayer task information for the group and individual members
 * Integrates data from multiple sources: Plugin, Wise Old Man, and Wiki
 */
const SlayerTaskPanel = () => {
  const { group, activeMember, setActiveMember } = useContext(GroupContext);
  const { 
    wikiService, 
    wikiState, 
    syncState, 
    womState,
    performSync, 
    wiseOldManService 
  } = useSync();
  
  const [slayerData, setSlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupStats, setGroupStats] = useState(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    monster_name: '',
    quantity: '',
    slayer_master: '',
    is_boss_task: false
  });
  const [monsterWikiInfo, setMonsterWikiInfo] = useState(null);
  const [loadingWikiInfo, setLoadingWikiInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  
  // Additional state for tracking data sources
  const [womSlayerData, setWomSlayerData] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    currentSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
  });

  // Fetch slayer data when active member changes
  useEffect(() => {
    if (activeMember) {
      fetchSlayerData(activeMember.name);
      fetchWomSlayerData(activeMember.name);
    }
  }, [activeMember]);

  // Fetch group stats on component mount
  useEffect(() => {
    fetchGroupStats();
  }, []);

  // Trigger data synchronization when component mounts
  useEffect(() => {
    if (!syncState.syncInProgress) {
      // Only perform background (quiet) sync
      performSync(false);
    }
  }, []);

  // Fetch monster info from wiki when current task changes
  useEffect(() => {
    if (wikiService && slayerData?.current_task?.monster_name) {
      fetchMonsterWikiInfo(slayerData.current_task.monster_name);
    }
  }, [slayerData?.current_task?.monster_name, wikiService]);

  /**
   * Get the active data source badge based on which source was used
   * @param {String} source - The data source used
   * @returns {Object} - Badge configuration object
   */
  const getSourceBadge = (source) => {
    switch(source) {
      case DataSourceTypes.PLUGIN: 
        return DataSourceBadges[DataSourceTypes.PLUGIN];
      case DataSourceTypes.WISE_OLD_MAN: 
        return DataSourceBadges[DataSourceTypes.WISE_OLD_MAN];
      case DataSourceTypes.WIKI: 
        return DataSourceBadges[DataSourceTypes.WIKI];
      default:
        return null;
    }
  };

  const fetchSlayerData = async (memberName) => {
    setLoading(true);
    setError(null);
    try {
      const data = await slayerTaskService.getSlayerTaskInfo(memberName);
      setSlayerData(data);
      
      // Update data source info if plugin data was found
      if (data) {
        setDataSourceInfo(prev => ({
          ...prev,
          currentSource: DataSourceTypes.PLUGIN,
          lastPluginSync: new Date()
        }));
      }
    } catch (err) {
      console.error('Failed to load slayer task data from plugin:', err);
      
      // If plugin data fails but WOM data exists, use that
      if (womSlayerData) {
        setDataSourceInfo(prev => ({
          ...prev,
          currentSource: DataSourceTypes.WISE_OLD_MAN
        }));
      } else {
        setError('Failed to load slayer task data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch Slayer data from Wise Old Man API
   * @param {String} memberName - Player name
   */
  const fetchWomSlayerData = async (memberName) => {
    if (!wiseOldManService) return;
    
    try {
      // First get player skills to check slayer level
      const skillsData = await wiseOldManService.getPlayerSkills(memberName);
      
      // Then get player achievement data for slayer tasks
      const achievementData = await wiseOldManService.getPlayerAchievements(memberName, 'skilling');
      
      // Parse and format WOM data into the expected format
      const womData = {
        slayer_level: skillsData?.slayer?.level || 1,
        slayer_xp: skillsData?.slayer?.experience || 0,
        slayer_achievements: achievementData?.filter(a => a.metric === 'slayer') || [],
        dataSource: DataSourceTypes.WISE_OLD_MAN
      };
      
      setWomSlayerData(womData);
      setDataSourceInfo(prev => ({
        ...prev,
        lastWomSync: new Date()
      }));
      
      // If we don't have plugin data, use WOM data
      if (!slayerData) {
        setDataSourceInfo(prev => ({
          ...prev,
          currentSource: DataSourceTypes.WISE_OLD_MAN
        }));
      }
    } catch (err) {
      console.error('Failed to load slayer data from Wise Old Man:', err);
    }
  };

  const fetchGroupStats = async () => {
    try {
      const stats = await slayerTaskService.getGroupSlayerStats();
      setGroupStats(stats);
    } catch (err) {
      console.error('Failed to load group stats:', err);
    }
  };

  const fetchMonsterWikiInfo = async (monsterName) => {
    if (!monsterName || !wikiService) return;

    setLoadingWikiInfo(true);
    try {
      const info = await wikiService.getMonsterInfo(monsterName);
      setMonsterWikiInfo(info);
      setDataSourceInfo(prev => ({
        ...prev,
        lastWikiSync: new Date()
      }));
    } catch (err) {
      console.error('Failed to fetch monster wiki info:', err);
      setMonsterWikiInfo({ error: 'Could not load wiki information for this monster.' });
    } finally {
      setLoadingWikiInfo(false);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Convert quantity to number
      const taskData = {
        ...newTaskData,
        quantity: parseInt(newTaskData.quantity, 10)
      };
      
      await slayerTaskService.createSlayerTask(activeMember.name, taskData);
      // Refresh data
      await fetchSlayerData(activeMember.name);
      await fetchGroupStats();

      // Trigger sync to update all connected clients
      if (performSync) {
        performSync(true);
      }

      setShowNewTaskForm(false);
      setNewTaskData({
        monster_name: '',
        quantity: '',
        slayer_master: '',
        is_boss_task: false
      });
    } catch (err) {
      setError('Failed to submit new slayer task. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTaskData({
      ...newTaskData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  /**
   * Get current data source status for the DataSourcesPanel
   */
  const getDataSources = () => {
    return getDataSourcesStatus(syncState, wikiState, womState);
  };

  // Render loading state
  if (loading && !slayerData && !womSlayerData) {
    return (
      <Card className="slayer-task-panel">
        <Card.Header className="osrs-header">
          <h4>
            <i className="bi bi-list-check me-2"></i>
            Slayer Tasks
          </h4>
        </Card.Header>
        <Card.Body className="text-center p-5">
          <Spinner animation="border" role="status" className="osrs-spinner">
            <span className="visually-hidden">Loading slayer tasks...</span>
          </Spinner>
          <p className="mt-3">Loading slayer data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Determine which data to display based on availability
  const displayData = slayerData || womSlayerData || null;
  const currentSourceBadge = getSourceBadge(dataSourceInfo.currentSource);

  // Render data sources panel
  const renderDataSourcesPanel = () => {
    const sources = getDataSourcesStatus(
      {
        ...syncState,
        lastSyncSuccess: slayerData !== null
      },
      {
        connected: monsterWikiInfo !== null && !monsterWikiInfo.error,
        lastUpdateTime: dataSourceInfo.lastWikiSync
      },
      {
        lastSuccess: womSlayerData !== null,
        lastUpdateTime: dataSourceInfo.lastWomSync
      }
    );
    
    return <DataSourcesPanel sources={sources} />;
  };

  return (
    <Card className="slayer-task-panel">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5>
            <i className="bi bi-sword me-2"></i>
            Slayer Tasks
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
            {activeMember && (
              <Button 
                variant="success" 
                size="sm" 
                onClick={() => setShowNewTaskForm(true)}
              >
                <i className="bi bi-plus-circle me-1"></i>
                New Task
              </Button>
            )}
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
            <p className="mt-2">Loading slayer data...</p>
          </div>
        ) : (
          <>
            {activeMember ? (
              <div>
                <div className="mb-4 d-flex align-items-center">
                  <h5 className="mb-0 me-3">
                    {activeMember.name}'s Slayer Info
                  </h5>
                  <div className="data-source-indicator">
                    <span className="me-2">Data source:</span>
                    <DataSourceBadge badge={DataSourceBadges[dataSourceInfo.currentSource]} />
                  </div>
                </div>
                
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-3"
                >
                  <Tab eventKey="current" title="Current Task">
                    {/* Current Task Visualization */}
                    {displayData && slayerData?.current_task ? (
                      <div className="current-task-container">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="d-flex align-items-center">
                              {slayerData.current_task.monster_name}
                              <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.PLUGIN]} />
                            </h5>
                            <div className="task-detail">
                              <span className="label">Assigned by:</span>
                              <span className="value">{slayerData.current_task.slayer_master}</span>
                            </div>
                            <div className="task-detail">
                              <span className="label">Quantity:</span>
                              <span className="value">{slayerData.current_task.quantity}</span>
                            </div>
                            <div className="task-detail">
                              <span className="label">Date:</span>
                              <span className="value">{slayerData.current_task.formatted_date}</span>
                            </div>
                            {slayerData.current_task.is_boss_task && (
                              <Badge bg="warning" className="mt-2">Boss Task</Badge>
                            )}
                          </div>

                          <div className="task-actions">
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => {
                                // Handle task completion
                                console.log('Task completed');
                              }}
                            >
                              Complete Task
                            </Button>
                          </div>
                        </div>

                        {/* Monster Wiki Info */}
                        {monsterWikiInfo && !monsterWikiInfo.error ? (
                          <div className="wiki-data-container">
                            <h6 className="data-source-header">
                              <i className="bi bi-book me-2"></i>
                              Monster Information
                              <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WIKI]} />
                            </h6>
                            
                            <Row>
                              <Col md={monsterWikiInfo.image ? 8 : 12}>
                                <div className="monster-wiki-info">
                                  {monsterWikiInfo.description && (
                                    <p>{monsterWikiInfo.description}</p>
                                  )}
                                  
                                  <div className="monster-stats">
                                    {monsterWikiInfo.combat_level && (
                                      <div className="stat-item">
                                        <span className="stat-label">Combat Level:</span>
                                        <span className="stat-value">{monsterWikiInfo.combat_level}</span>
                                      </div>
                                    )}
                                    
                                    {monsterWikiInfo.hitpoints && (
                                      <div className="stat-item">
                                        <span className="stat-label">Hitpoints:</span>
                                        <span className="stat-value">{monsterWikiInfo.hitpoints}</span>
                                      </div>
                                    )}
                                    
                                    {monsterWikiInfo.slayer_level && (
                                      <div className="stat-item">
                                        <span className="stat-label">Slayer Requirement:</span>
                                        <span className="stat-value">{monsterWikiInfo.slayer_level}</span>
                                      </div>
                                    )}
                                    
                                    {monsterWikiInfo.attack_style && (
                                      <div className="stat-item">
                                        <span className="stat-label">Attack Style:</span>
                                        <span className="stat-value">{monsterWikiInfo.attack_style}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Col>
                              
                              {monsterWikiInfo.image && (
                                <Col md={4} className="text-center">
                                  <img 
                                    src={monsterWikiInfo.image} 
                                    alt={slayerData.current_task.monster_name}
                                    className="monster-image"
                                  />
                                </Col>
                              )}
                            </Row>
                            
                            <a 
                              href={`https://oldschool.runescape.wiki/w/${encodeURIComponent(slayerData.current_task.monster_name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wiki-item-reference"
                            >
                              <i className="bi bi-box-arrow-up-right me-1"></i>
                              View on OSRS Wiki
                            </a>
                          </div>
                        ) : loadingWikiInfo ? (
                          <div className="text-center p-3">
                            <Spinner animation="border" size="sm" />
                            <span className="ms-2">Loading wiki information...</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Alert variant="info">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        No active slayer task. Get a new assignment from a Slayer Master or create one below.
                      </Alert>
                    )}

                    {/* Slayer statistics from Wise Old Man when available */}
                    {womSlayerData && (
                      <div className="wom-data-container mt-4">
                        <h6 className="data-source-header">
                          <i className="bi bi-graph-up me-2"></i>
                          Slayer Statistics
                          <DataSourceBadge badge={DataSourceBadges[DataSourceTypes.WISE_OLD_MAN]} />
                        </h6>
                        
                        <div className="d-flex mb-3">
                          <div className="me-4">
                            <div className="stat-item">
                              <span className="stat-label">Slayer Level:</span>
                              <span className="stat-value">{womSlayerData.slayer_level}</span>
                            </div>
                          </div>
                          <div>
                            <div className="stat-item">
                              <span className="stat-label">Total XP:</span>
                              <span className="stat-value">{womSlayerData.slayer_xp.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {womSlayerData.slayer_achievements?.length > 0 && (
                          <div>
                            <h6 className="mb-2">Recent Achievements</h6>
                            <ul className="slayer-achievements">
                              {womSlayerData.slayer_achievements.slice(0, 3).map((achievement, i) => (
                                <li key={i}>
                                  {achievement.measure.toLocaleString()} {achievement.metric}
                                  <span className="achievement-date">
                                    {new Date(achievement.createdAt).toLocaleDateString()}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* New Task Form */}
                    {showNewTaskForm && (
                      <Card className="mt-4">
                        <Card.Header>
                          <h5 className="mb-0">New Slayer Task</h5>
                        </Card.Header>
                        <Card.Body>
                          <Form onSubmit={handleSubmitTask}>
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Monster Name</Form.Label>
                                  <Form.Control
                                    type="text"
                                    name="monster_name"
                                    value={newTaskData.monster_name}
                                    onChange={handleInputChange}
                                    required
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Quantity</Form.Label>
                                  <Form.Control
                                    type="number"
                                    name="quantity"
                                    value={newTaskData.quantity}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            
                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-3">
                                  <Form.Label>Slayer Master</Form.Label>
                                  <Form.Select
                                    name="slayer_master"
                                    value={newTaskData.slayer_master}
                                    onChange={handleInputChange}
                                    required
                                  >
                                    <option value="">Select Slayer Master</option>
                                    <option value="Turael">Turael</option>
                                    <option value="Mazchna">Mazchna</option>
                                    <option value="Vannaka">Vannaka</option>
                                    <option value="Chaeldar">Chaeldar</option>
                                    <option value="Konar">Konar</option>
                                    <option value="Nieve">Nieve</option>
                                    <option value="Duradel">Duradel</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-3 mt-md-4">
                                  <Form.Check
                                    type="checkbox"
                                    label="Boss Task"
                                    name="is_boss_task"
                                    checked={newTaskData.is_boss_task}
                                    onChange={handleInputChange}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            
                            <div className="d-flex gap-2 mt-3">
                              <Button 
                                variant="primary" 
                                type="submit"
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Spinner animation="border" size="sm" />
                                    <span className="ms-2">Saving...</span>
                                  </>
                                ) : (
                                  <>Save Task</>
                                )}
                              </Button>
                              <Button 
                                variant="outline-secondary"
                                onClick={() => setShowNewTaskForm(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </Form>
                        </Card.Body>
                      </Card>
                    )}
                  </Tab>
                  
                  <Tab eventKey="history" title="Task History">
                    {/* Task History Table */}
                    {slayerData?.task_history && slayerData.task_history.length > 0 ? (
                      <Table striped responsive className="task-history-table">
                        <thead>
                          <tr>
                            <th>Monster</th>
                            <th>Quantity</th>
                            <th>Slayer Master</th>
                            <th>Assigned</th>
                            <th>Completed</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slayerData.task_history.map((task, index) => (
                            <tr key={index}>
                              <td>
                                {task.monster_name}
                                {task.is_boss_task && (
                                  <Badge bg="warning" className="ms-2">Boss</Badge>
                                )}
                              </td>
                              <td>{task.quantity}</td>
                              <td>{task.slayer_master}</td>
                              <td>{task.formatted_assigned_date}</td>
                              <td>{task.formatted_completed_date}</td>
                              <td>
                                <Badge bg={task.completed_at ? 'success' : 'primary'}>
                                  {task.completed_at ? 'Completed' : 'In Progress'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        No task history available.
                      </Alert>
                    )}
                  </Tab>
                  
                  <Tab eventKey="group" title="Group Stats">
                    {/* Group Slayer Statistics */}
                    {groupStats ? (
                      <div className="group-stats">
                        <Row className="mb-4">
                          <Col md={4}>
                            <div className="stat-card">
                              <div className="stat-value">{groupStats.total_points.toLocaleString()}</div>
                              <div className="stat-label">Total Slayer Points</div>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="stat-card">
                              <div className="stat-value">{groupStats.total_tasks_completed}</div>
                              <div className="stat-label">Tasks Completed</div>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="stat-card">
                              <div className="stat-value">{groupStats.highest_streak}</div>
                              <div className="stat-label">Highest Streak</div>
                            </div>
                          </Col>
                        </Row>
                        
                        <h5 className="mb-3">Member Statistics</h5>
                        <Table striped responsive className="member-stats-table">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Slayer Level</th>
                              <th>Tasks Completed</th>
                              <th>Streak</th>
                              <th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupStats.members.map((member, index) => (
                              <tr key={index}>
                                <td>{member.name}</td>
                                <td>{member.slayer_level}</td>
                                <td>{member.tasks_completed}</td>
                                <td>{member.task_streak}</td>
                                <td>{member.slayer_points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <Alert variant="info">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        No group statistics available.
                      </Alert>
                    )}
                  </Tab>
                </Tabs>
              </div>
            ) : (
              <div className="text-center p-4">
                <Alert variant="info">
                  Select a group member to view their slayer task information.
                </Alert>
              </div>
            )}
            
            <h5 className="mt-4 mb-3">Group Slayer Stats</h5>
            {groupStats ? (
              <div className="group-stats">
                <Row className="mb-4">
                  <Col md={4}>
                    <div className="stat-card">
                      <div className="stat-value">{groupStats.total_points.toLocaleString()}</div>
                      <div className="stat-label">Total Slayer Points</div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="stat-card">
                      <div className="stat-value">{groupStats.total_tasks_completed}</div>
                      <div className="stat-label">Tasks Completed</div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="stat-card">
                      <div className="stat-value">{groupStats.highest_streak}</div>
                      <div className="stat-label">Highest Streak</div>
                    </div>
                  </Col>
                </Row>
                
                <h5 className="mb-3">Member Statistics</h5>
                <Table striped responsive className="member-stats-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Slayer Level</th>
                      <th>Tasks Completed</th>
                      <th>Streak</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.members.map((member, index) => (
                      <tr key={index}>
                        <td>{member.name}</td>
                        <td>{member.slayer_level}</td>
                        <td>{member.tasks_completed}</td>
                        <td>{member.task_streak}</td>
                        <td>{member.slayer_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="info">
                <i className="bi bi-info-circle-fill me-2"></i>
                No group statistics available.
              </Alert>
            )}
            
            {/* Data Sources Panel */}
            {renderDataSourcesPanel()}
          </>
        )}
      </Card.Body>
      
      {/* New Task Form Modal */}
      {showNewTaskForm && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">New Slayer Task</h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmitTask}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Monster Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="monster_name"
                      value={newTaskData.monster_name}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      name="quantity"
                      value={newTaskData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Slayer Master</Form.Label>
                    <Form.Select
                      name="slayer_master"
                      value={newTaskData.slayer_master}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Slayer Master</option>
                      <option value="Turael">Turael</option>
                      <option value="Mazchna">Mazchna</option>
                      <option value="Vannaka">Vannaka</option>
                      <option value="Chaeldar">Chaeldar</option>
                      <option value="Konar">Konar</option>
                      <option value="Nieve">Nieve</option>
                      <option value="Duradel">Duradel</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3 mt-md-4">
                    <Form.Check
                      type="checkbox"
                      label="Boss Task"
                      name="is_boss_task"
                      checked={newTaskData.is_boss_task}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              
              <div className="d-flex gap-2 mt-3">
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2">Saving...</span>
                    </>
                  ) : (
                    <>Save Task</>
                  )}
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={() => setShowNewTaskForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </Card>
  );
};

export default SlayerTaskPanel;
