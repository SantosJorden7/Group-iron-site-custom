import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Form, ProgressBar, Badge, Accordion, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext.js';
import { useSync } from '../../contexts/SyncContext.js';
import * as groupMilestonesService from './group-milestones-service';
import './GroupMilestonesPanel.css';

/**
 * Group Milestones Panel Component
 * 
 * Displays and manages group milestones with full integration of:
 * - Plugin data (primary source)
 * - Wise Old Man data (secondary source)
 * - Wiki data (enrichment)
 */
const GroupMilestonesPanel = () => {
  const { group } = useContext(GroupContext);
  const { syncState, performSync, wikiService, wiseOldManService, getMergedPlayerData } = useSync();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    milestone_type: '',
    include_completed: true
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom',
    targetData: {},
    completionCriteria: null,
    endDate: ''
  });
  const [playerData, setPlayerData] = useState({});
  const [dataSourcesInfo, setDataSourcesInfo] = useState({
    plugin: { available: false, timestamp: null },
    wom: { available: false, timestamp: null },
    wiki: { available: false, timestamp: null }
  });

  // Fetch milestones on component mount and when filters change
  useEffect(() => {
    fetchMilestones();
    
    // Trigger sync when component mounts
    if (!syncState.syncInProgress) {
      performSync(false); // Background sync
    }
  }, [filters]);
  
  // Also reload milestones and player data when syncState changes (when data is refreshed)
  useEffect(() => {
    if (syncState.lastSyncTime && !syncState.syncInProgress) {
      fetchMilestones();
      fetchAllMembersData();
    }
  }, [syncState.lastSyncTime]);

  // Fetch player data for all group members
  const fetchAllMembersData = async () => {
    if (!group || !group.members || group.members.length === 0) return;
    
    try {
      const playerDataMap = {};
      const dataSourcesStatus = {
        plugin: { available: false, timestamp: null },
        wom: { available: false, timestamp: null },
        wiki: { available: syncState.lastWikiAccess !== null, timestamp: syncState.lastWikiAccess }
      };
      
      await Promise.all(
        group.members.map(async (member) => {
          try {
            // Get merged data from both plugin and WOM
            const mergedData = await getMergedPlayerData(member.name);
            playerDataMap[member.name] = mergedData;
            
            // Update data sources info
            if (mergedData.pluginData) {
              dataSourcesStatus.plugin.available = true;
              dataSourcesStatus.plugin.timestamp = mergedData.pluginData.lastSyncTime || syncState.lastSyncTime;
            }
            
            if (mergedData.womData) {
              dataSourcesStatus.wom.available = true;
              dataSourcesStatus.wom.timestamp = mergedData.womData.updatedAt;
            }
          } catch (error) {
            console.error(`Error fetching data for ${member.name}:`, error);
          }
        })
      );
      
      setPlayerData(playerDataMap);
      setDataSourcesInfo(dataSourcesStatus);
    } catch (error) {
      console.error('Error fetching player data:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await groupMilestonesService.getGroupMilestones(filters);
      
      // Enrich milestone data with both Wise Old Man and Wiki information
      const enrichedMilestones = await Promise.all(
        data.map(async (milestone) => {
          let enrichedMilestone = { ...milestone };
          
          // Get Wise Old Man data if applicable (e.g., for skill or boss milestones)
          if (milestone.type === 'skill' || milestone.type === 'boss') {
            try {
              if (milestone.type === 'skill' && milestone.targetData?.skill) {
                const skillData = await fetchSkillDataFromSources(milestone.targetData.skill);
                if (skillData) {
                  enrichedMilestone.womData = skillData;
                }
              } else if (milestone.type === 'boss' && milestone.targetData?.boss) {
                const bossData = await fetchBossKCFromSources(milestone.targetData.boss);
                if (bossData) {
                  enrichedMilestone.womData = bossData;
                }
              }
            } catch (error) {
              console.warn(`Could not enrich milestone ${milestone.title} with WOM data:`, error);
            }
          }
          
          // Get Wiki data for enrichment
          if (milestone.wikiReference && milestone.wikiReferenceType) {
            try {
              let wikiData = null;
              
              if (wikiService) {
                if (milestone.wikiReferenceType === 'item') {
                  wikiData = await wikiService.getItem(milestone.wikiReference);
                } else if (milestone.wikiReferenceType === 'monster') {
                  wikiData = await wikiService.getMonster(milestone.wikiReference);
                } else if (milestone.wikiReferenceType === 'skill') {
                  // For skills, get wiki page info
                  wikiData = await wikiService.getPageInfo(milestone.wikiReference);
                }
                
                if (wikiData) {
                  enrichedMilestone.wikiData = wikiData;
                }
              }
            } catch (error) {
              console.warn(`Could not enrich milestone ${milestone.title} with wiki data:`, error);
            }
          }
          
          // Calculate progress based on all data sources
          enrichedMilestone = calculateMilestoneProgress(enrichedMilestone);
          
          return enrichedMilestone;
        })
      );
      
      setMilestones(enrichedMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      setError('Failed to load milestones. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch skill data from all available sources, prioritizing plugin data
  const fetchSkillDataFromSources = async (skillName) => {
    if (!group || !group.members || group.members.length === 0) return null;
    
    try {
      const skillData = {
        memberProgress: {}
      };
      
      await Promise.all(
        group.members.map(async (member) => {
          const memberName = member.name;
          
          // Try to get from plugin data first (via playerData)
          if (playerData[memberName]?.skills?.[skillName.toLowerCase()]) {
            const pluginSkill = playerData[memberName].skills[skillName.toLowerCase()];
            skillData.memberProgress[memberName] = {
              level: pluginSkill.level,
              xp: pluginSkill.xp,
              source: 'plugin'
            };
            return;
          }
          
          // If not in plugin data, try Wise Old Man
          try {
            const womSkills = await wiseOldManService.getPlayerSkills(memberName);
            const womSkill = womSkills?.[skillName.toLowerCase()];
            
            if (womSkill) {
              skillData.memberProgress[memberName] = {
                level: womSkill.level,
                xp: womSkill.experience,
                source: 'wom'
              };
              return;
            }
          } catch (error) {
            console.warn(`No Wise Old Man skill data for ${memberName}:`, error);
          }
          
          // Fallback to default values if no data from any source
          skillData.memberProgress[memberName] = {
            level: 1,
            xp: 0,
            source: 'fallback'
          };
        })
      );
      
      return skillData;
    } catch (error) {
      console.error('Error fetching skill data from sources:', error);
      return null;
    }
  };

  // Fetch boss KC data from all available sources, prioritizing plugin data
  const fetchBossKCFromSources = async (bossName) => {
    if (!group || !group.members || group.members.length === 0) return null;
    
    try {
      const bossData = {
        memberProgress: {}
      };
      
      await Promise.all(
        group.members.map(async (member) => {
          const memberName = member.name;
          
          // Try to get from plugin data first (via playerData)
          if (playerData[memberName]?.bosses?.[bossName.toLowerCase()]) {
            const pluginBoss = playerData[memberName].bosses[bossName.toLowerCase()];
            bossData.memberProgress[memberName] = {
              killCount: pluginBoss.killCount,
              source: 'plugin'
            };
            return;
          }
          
          // If not in plugin data, try Wise Old Man
          try {
            const womBosses = await wiseOldManService.getPlayerBossKCs(memberName);
            const normalizedBossName = normalizeBossName(bossName);
            const womBoss = womBosses?.[normalizedBossName];
            
            if (womBoss) {
              bossData.memberProgress[memberName] = {
                killCount: womBoss.kills,
                source: 'wom'
              };
              return;
            }
          } catch (error) {
            console.warn(`No Wise Old Man boss KC data for ${memberName}:`, error);
          }
          
          // Fallback to default values if no data from any source
          bossData.memberProgress[memberName] = {
            killCount: 0,
            source: 'fallback'
          };
        })
      );
      
      return bossData;
    } catch (error) {
      console.error('Error fetching boss KC data from sources:', error);
      return null;
    }
  };

  // Normalize boss names between different data sources
  const normalizeBossName = (bossName) => {
    // Map from common boss names to WOM API boss names
    const bossNameMap = {
      'zulrah': 'zulrah',
      'vorkath': 'vorkath',
      'corporeal beast': 'corporeal_beast',
      'callisto': 'callisto',
      'chamber of xeric': 'chambers_of_xeric',
      'cox': 'chambers_of_xeric',
      'theatre of blood': 'theatre_of_blood',
      'tob': 'theatre_of_blood',
      'tombs of amascut': 'tombs_of_amascut',
      'toa': 'tombs_of_amascut',
      'jad': 'tztok_jad',
      'zuk': 'tzkal_zuk',
      // Add more mappings as needed
    };
    
    const normalized = bossName.toLowerCase().trim();
    return bossNameMap[normalized] || normalized;
  };

  // Calculate milestone progress based on all data sources
  const calculateMilestoneProgress = (milestone) => {
    if (!milestone.targetData) return milestone;
    
    let progress = 0;
    let totalNeeded = 0;
    let currentValue = 0;
    
    switch (milestone.type) {
      case 'skill':
        const skillName = milestone.targetData.skill;
        const targetLevel = parseInt(milestone.targetData.level || 99);
        totalNeeded = targetLevel;
        
        if (milestone.womData?.memberProgress) {
          let groupHighestLevel = 0;
          
          // Find the highest level among members
          Object.values(milestone.womData.memberProgress).forEach(memberProgress => {
            if (memberProgress.level > groupHighestLevel) {
              groupHighestLevel = memberProgress.level;
            }
          });
          
          currentValue = groupHighestLevel;
          progress = Math.min(100, (groupHighestLevel / targetLevel) * 100);
        }
        break;
        
      case 'boss':
        const bossName = milestone.targetData.boss;
        const targetKC = parseInt(milestone.targetData.killCount || 1);
        totalNeeded = targetKC;
        
        if (milestone.womData?.memberProgress) {
          let totalKC = 0;
          
          // Sum up KCs across members
          Object.values(milestone.womData.memberProgress).forEach(memberProgress => {
            totalKC += memberProgress.killCount || 0;
          });
          
          currentValue = totalKC;
          progress = Math.min(100, (totalKC / targetKC) * 100);
        }
        break;
        
      // Handle other milestone types as needed
    }
    
    return {
      ...milestone,
      progress,
      currentValue,
      totalNeeded
    };
  };

  // Filter change handler
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Form field change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply template when milestone type changes
  const handleTypeChange = (e) => {
    const type = e.target.value;
    const template = groupMilestonesService.generateMilestoneTemplate(type);
    
    setFormData(prev => ({
      ...prev,
      type,
      title: template.title,
      description: template.description,
      targetData: template.targetData,
      completionCriteria: template.completionCriteria
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      await groupMilestonesService.createMilestone(formData);
      
      // Reset form and hide it
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        targetData: {},
        completionCriteria: null,
        endDate: ''
      });
      setShowForm(false);
      
      // Refresh milestones
      await fetchMilestones();
    } catch (error) {
      console.error('Error creating milestone:', error);
      setError('Failed to create milestone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle milestone completion status
  const toggleMilestoneStatus = async (milestoneId, currentStatus) => {
    try {
      setLoading(true);
      setError(null);
      await groupMilestonesService.toggleMilestoneCompletion(milestoneId, currentStatus);
      
      // Refresh milestones
      await fetchMilestones();
    } catch (error) {
      console.error('Error toggling milestone status:', error);
      setError('Failed to update milestone status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a milestone
  const deleteMilestone = async (milestoneId) => {
    if (!window.confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await groupMilestonesService.deleteMilestone(milestoneId);
      
      // Refresh milestones
      await fetchMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      setError('Failed to delete milestone. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render milestone type badge
  const renderMilestoneTypeBadge = (type) => {
    let bgColor = 'secondary';
    
    switch (type) {
      case 'quest':
        bgColor = 'primary';
        break;
      case 'boss':
        bgColor = 'danger';
        break;
      case 'skill':
        bgColor = 'info';
        break;
      case 'item':
        bgColor = 'warning';
        break;
      case 'custom':
        bgColor = 'secondary';
        break;
      default:
        bgColor = 'secondary';
    }
    
    return (
      <Badge 
        bg={bgColor} 
        className={`milestone-type-badge milestone-type-${type}`}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  // Render the progress indicator for a milestone
  const renderProgressIndicator = (milestone) => {
    const progress = milestone.progress || 0;
    const colorClass = progress >= 100 ? 'success' : progress >= 50 ? 'info' : 'warning';
    
    return (
      <div className="milestone-progress">
        <ProgressBar 
          now={progress} 
          variant={colorClass} 
          label={`${Math.floor(progress)}%`} 
        />
        {milestone.currentValue !== undefined && milestone.totalNeeded !== undefined && (
          <small className="milestone-progress-text">
            {milestone.currentValue} / {milestone.totalNeeded}
            {renderDataSourceBadge(milestone)}
          </small>
        )}
      </div>
    );
  };
  
  // Render a badge indicating the data source (Plugin, WOM, Wiki)
  const renderDataSourceBadge = (milestone) => {
    let source = 'unknown';
    let badgeVariant = 'secondary';
    
    if (milestone.womData) {
      // Check if any member data is from plugin
      const hasPluginData = Object.values(milestone.womData.memberProgress || {})
        .some(mp => mp.source === 'plugin');
      
      if (hasPluginData) {
        source = 'Plugin';
        badgeVariant = 'success';
      } else {
        source = 'WOM';
        badgeVariant = 'info';
      }
    } else if (milestone.wikiData) {
      source = 'Wiki';
      badgeVariant = 'warning';
    }
    
    return (
      <OverlayTrigger
        placement="right"
        overlay={
          <Tooltip>
            Data provided by: {source}
          </Tooltip>
        }
      >
        <Badge 
          className="ml-2 data-source-badge" 
          variant={badgeVariant}
        >
          {source.charAt(0)}
        </Badge>
      </OverlayTrigger>
    );
  };
  
  // Render the timestamp for when data was last updated
  const renderTimestamp = (timestamp) => {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    return (
      <span className="timestamp">
        {date.toLocaleString()}
      </span>
    );
  };
  
  // Render the data sources status panel
  const renderDataSourcesPanel = () => {
    return (
      <Card className="mb-3 data-sources-panel">
        <Card.Header>Data Sources</Card.Header>
        <Card.Body>
          <div className="data-sources-grid">
            <div className="data-source-item">
              <div className="data-source-name">
                <Badge variant="success">P</Badge> RuneLite Plugin
              </div>
              <div className="data-source-status">
                {dataSourcesInfo.plugin.available ? (
                  <>
                    <Badge variant="success">Available</Badge>
                    <div className="data-source-timestamp">
                      Last update: {renderTimestamp(dataSourcesInfo.plugin.timestamp)}
                    </div>
                  </>
                ) : (
                  <Badge variant="danger">Not Synced</Badge>
                )}
              </div>
            </div>
            
            <div className="data-source-item">
              <div className="data-source-name">
                <Badge variant="info">W</Badge> Wise Old Man
              </div>
              <div className="data-source-status">
                {dataSourcesInfo.wom.available ? (
                  <>
                    <Badge variant="success">Available</Badge>
                    <div className="data-source-timestamp">
                      Last update: {renderTimestamp(dataSourcesInfo.wom.timestamp)}
                    </div>
                  </>
                ) : (
                  <Badge variant="warning">Not Connected</Badge>
                )}
              </div>
            </div>
            
            <div className="data-source-item">
              <div className="data-source-name">
                <Badge variant="warning">K</Badge> OSRS Wiki
              </div>
              <div className="data-source-status">
                {dataSourcesInfo.wiki.available ? (
                  <>
                    <Badge variant="success">Available</Badge>
                    <div className="data-source-timestamp">
                      Last access: {renderTimestamp(dataSourcesInfo.wiki.timestamp)}
                    </div>
                  </>
                ) : (
                  <Badge variant="secondary">Not Used</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="data-source-priority-info mt-3">
            <small className="text-muted">
              Data priority: Plugin → Wise Old Man → Wiki
            </small>
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Render member progress for a milestone
  const renderMemberProgress = (milestone) => {
    if (!milestone.womData?.memberProgress || Object.keys(milestone.womData.memberProgress).length === 0) {
      return null;
    }
    
    return (
      <div className="member-progress-container mt-3">
        <h6>Member Progress:</h6>
        {Object.entries(milestone.womData.memberProgress).map(([memberName, progress]) => {
          let progressValue, progressLabel;
          
          if (milestone.type === 'skill') {
            progressValue = progress.level;
            progressLabel = `Level ${progress.level} (${progress.xp.toLocaleString()} xp)`;
          } else if (milestone.type === 'boss') {
            progressValue = progress.killCount;
            progressLabel = `${progress.killCount} KC`;
          } else {
            return null;
          }
          
          // Calculate percentage relative to target
          const targetValue = milestone.type === 'skill' 
            ? parseInt(milestone.targetData.level || 99)
            : parseInt(milestone.targetData.killCount || 1);
          
          const percentage = Math.min(100, (progressValue / targetValue) * 100);
          const colorClass = percentage >= 100 ? 'success' : percentage >= 50 ? 'info' : 'warning';
          
          return (
            <div key={memberName} className="member-progress-item">
              <div className="member-progress-name">
                {memberName}
                {renderMemberDataSourceBadge(progress.source)}
              </div>
              <ProgressBar 
                now={percentage} 
                variant={colorClass} 
                label={progressLabel} 
              />
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render a badge indicating the data source for member data
  const renderMemberDataSourceBadge = (source) => {
    let badgeText, badgeVariant;
    
    switch (source) {
      case 'plugin':
        badgeText = 'P';
        badgeVariant = 'success';
        break;
      case 'wom':
        badgeText = 'W';
        badgeVariant = 'info';
        break;
      default:
        badgeText = '?';
        badgeVariant = 'secondary';
    }
    
    return (
      <OverlayTrigger
        placement="right"
        overlay={
          <Tooltip>
            Data source: {source === 'plugin' ? 'RuneLite Plugin' : source === 'wom' ? 'Wise Old Man' : 'Unknown'}
          </Tooltip>
        }
      >
        <Badge 
          className="ml-2 data-source-badge" 
          variant={badgeVariant}
        >
          {badgeText}
        </Badge>
      </OverlayTrigger>
    );
  };

  return (
    <Container className="group-milestones-panel">
      <Row className="mb-3">
        <Col>
          <h2>Group Milestones</h2>
          <p>Track and manage your group's achievements and goals.</p>
        </Col>
      </Row>
      
      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger">{error}</Alert>
          </Col>
        </Row>
      )}
      
      {/* Display data sources panel */}
      <Row className="mb-3">
        <Col>
          {renderDataSourcesPanel()}
        </Col>
      </Row>
      
      <Row className="mb-3">
        <Col md={8}>
          <Form inline className="milestone-filters">
            <Form.Group className="mr-3">
              <Form.Label className="mr-2">Type:</Form.Label>
              <Form.Control 
                as="select" 
                name="milestone_type" 
                value={filters.milestone_type} 
                onChange={handleFilterChange}
                className="filter-select"
              >
                <option value="">All</option>
                <option value="skill">Skill</option>
                <option value="boss">Boss</option>
                <option value="quest">Quest</option>
                <option value="item">Item</option>
                <option value="custom">Custom</option>
              </Form.Control>
            </Form.Group>
            
            <Form.Group>
              <Form.Check 
                type="checkbox" 
                id="include-completed" 
                name="include_completed" 
                checked={filters.include_completed} 
                onChange={handleFilterChange} 
                label="Show Completed" 
              />
            </Form.Group>
          </Form>
        </Col>
        
        <Col md={4} className="text-right">
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Hide Form' : 'Add Milestone'}
          </Button>
        </Col>
      </Row>
      
      {showForm && (
        <Row className="mb-3">
          <Col>
            <Card className="add-milestone-form">
              <Card.Header>Add New Milestone</Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group>
                    <Form.Label>Milestone Type</Form.Label>
                    <Form.Control 
                      as="select" 
                      name="type" 
                      value={formData.type} 
                      onChange={handleTypeChange}
                    >
                      <option value="custom">Custom</option>
                      <option value="skill">Skill</option>
                      <option value="boss">Boss</option>
                      <option value="quest">Quest</option>
                      <option value="item">Item</option>
                    </Form.Control>
                  </Form.Group>
                  
                  <Form.Group>
                    <Form.Label>Title</Form.Label>
                    <Form.Control 
                      type="text" 
                      name="title" 
                      value={formData.title} 
                      onChange={handleFormChange} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleFormChange} 
                      rows={3} 
                    />
                  </Form.Group>
                  
                  {/* Render specific fields based on milestone type */}
                  {formData.type === 'skill' && (
                    <>
                      <Form.Group>
                        <Form.Label>Skill</Form.Label>
                        <Form.Control 
                          as="select" 
                          name="skill" 
                          value={formData.targetData.skill || ''} 
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            targetData: { ...prev.targetData, skill: e.target.value }
                          }))}
                          required
                        >
                          <option value="">Select Skill</option>
                          <option value="attack">Attack</option>
                          <option value="strength">Strength</option>
                          <option value="defence">Defence</option>
                          <option value="ranged">Ranged</option>
                          <option value="prayer">Prayer</option>
                          <option value="magic">Magic</option>
                          <option value="runecraft">Runecraft</option>
                          <option value="construction">Construction</option>
                          <option value="hitpoints">Hitpoints</option>
                          <option value="agility">Agility</option>
                          <option value="herblore">Herblore</option>
                          <option value="thieving">Thieving</option>
                          <option value="crafting">Crafting</option>
                          <option value="fletching">Fletching</option>
                          <option value="slayer">Slayer</option>
                          <option value="hunter">Hunter</option>
                          <option value="mining">Mining</option>
                          <option value="smithing">Smithing</option>
                          <option value="fishing">Fishing</option>
                          <option value="cooking">Cooking</option>
                          <option value="firemaking">Firemaking</option>
                          <option value="woodcutting">Woodcutting</option>
                          <option value="farming">Farming</option>
                        </Form.Control>
                      </Form.Group>
                      
                      <Form.Group>
                        <Form.Label>Target Level</Form.Label>
                        <Form.Control 
                          type="number" 
                          name="level" 
                          value={formData.targetData.level || ''} 
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            targetData: { ...prev.targetData, level: e.target.value }
                          }))}
                          min="1"
                          max="99"
                          required
                        />
                      </Form.Group>
                    </>
                  )}
                  
                  {formData.type === 'boss' && (
                    <>
                      <Form.Group>
                        <Form.Label>Boss</Form.Label>
                        <Form.Control 
                          type="text" 
                          name="boss" 
                          value={formData.targetData.boss || ''} 
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            targetData: { ...prev.targetData, boss: e.target.value }
                          }))}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group>
                        <Form.Label>Target Kill Count</Form.Label>
                        <Form.Control 
                          type="number" 
                          name="killCount" 
                          value={formData.targetData.killCount || ''} 
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            targetData: { ...prev.targetData, killCount: e.target.value }
                          }))}
                          min="1"
                          required
                        />
                      </Form.Group>
                    </>
                  )}
                  
                  <Form.Group>
                    <Form.Label>Target Date (Optional)</Form.Label>
                    <Form.Control 
                      type="date" 
                      name="endDate" 
                      value={formData.endDate} 
                      onChange={handleFormChange} 
                    />
                  </Form.Group>
                  
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : 'Create Milestone'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      <Row>
        <Col>
          {loading && !milestones.length ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-2">Loading milestones...</p>
            </div>
          ) : !milestones.length ? (
            <div className="text-center py-5">
              <p>No milestones found. Create your first one!</p>
            </div>
          ) : (
            <div className="milestones-grid">
              {milestones.map(milestone => (
                <Card 
                  key={milestone.id} 
                  className={`milestone-card ${milestone.completed ? 'milestone-completed' : ''}`}
                >
                  <Card.Body>
                    <div className="milestone-header">
                      <h5 className="milestone-title">
                        {milestone.title}
                        {milestone.completed && (
                          <Badge variant="success" className="ml-2">Completed</Badge>
                        )}
                        {renderMilestoneTypeBadge(milestone.type)}
                      </h5>
                      
                      {milestone.endDate && (
                        <div className="milestone-date">
                          <small>
                            {new Date(milestone.endDate).toLocaleDateString()}
                          </small>
                        </div>
                      )}
                    </div>
                    
                    <Card.Text className="milestone-description">
                      {milestone.description}
                    </Card.Text>
                    
                    {renderProgressIndicator(milestone)}
                    
                    {/* Display member progress for applicable milestone types */}
                    {renderMemberProgress(milestone)}
                    
                    {/* Wiki data if available */}
                    {milestone.wikiData && (
                      <div className="milestone-wiki-data">
                        <div className="milestone-wiki-title">
                          {milestone.wikiData.name || milestone.wikiReference}
                          <Badge variant="warning" className="ml-2">Wiki</Badge>
                        </div>
                        {milestone.wikiData.description && (
                          <div className="milestone-wiki-description">
                            {milestone.wikiData.description}
                          </div>
                        )}
                        {milestone.wikiData.url && (
                          <a 
                            href={milestone.wikiData.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="wiki-item-reference"
                          >
                            View on OSRS Wiki
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="milestone-actions">
                      <button 
                        className={`milestone-action-btn ${milestone.completed ? '' : 'milestone-complete-btn'}`}
                        onClick={() => toggleMilestoneStatus(milestone.id, milestone.completed)}
                      >
                        {milestone.completed ? 'Mark Incomplete' : 'Mark Complete'}
                      </button>
                      
                      <button 
                        className="milestone-action-btn milestone-delete-btn"
                        onClick={() => deleteMilestone(milestone.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default GroupMilestonesPanel;
