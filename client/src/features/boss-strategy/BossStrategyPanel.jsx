import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Form, Row, Col, Table, Tabs, Tab, Spinner, Alert, Badge } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext';
import { useSync } from '../../contexts/SyncContext';
import * as bossStrategyService from './boss-strategy-service';
import './BossStrategyPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * BossStrategyPanel Component
 * Displays boss strategy information and recommendations for group members
 * Integrates data from multiple sources: Plugin, Wise Old Man, and Wiki
 */
const BossStrategyPanel = () => {
  const { group, activeMember, setActiveMember } = useContext(GroupContext);
  const { 
    wikiService, 
    wikiState, 
    syncState, 
    womState,
    performSync, 
    wiseOldManService 
  } = useSync();
  
  const [selectedBoss, setSelectedBoss] = useState(null);
  const [bossList, setBossList] = useState([]);
  const [selectedGearSetup, setSelectedGearSetup] = useState(null);
  const [gearSetups, setGearSetups] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasActiveSlayerTask, setHasActiveSlayerTask] = useState(false);
  const [slayerRecommendations, setSlayerRecommendations] = useState([]);
  const [showSlayerOnly, setShowSlayerOnly] = useState(false);
  const [error, setError] = useState(null);
  const [wikiInfo, setWikiInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('gear');
  
  // Additional state for multi-source data integration
  const [womBossData, setWomBossData] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    currentSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
    bossDataSource: null,
    playerStatsSource: null
  });

  // Load boss list on component mount
  useEffect(() => {
    const loadBossList = async () => {
      try {
        const bosses = await bossStrategyService.getBossList();
        setBossList(bosses);
        
        // Set default selected boss if none is selected
        if (!selectedBoss && bosses.length > 0) {
          setSelectedBoss(bosses[0].name);
        }
        
        // Update data source info
        setDataSourceInfo(prev => ({
          ...prev,
          bossDataSource: DataSourceTypes.PLUGIN,
          lastPluginSync: new Date()
        }));
      } catch (err) {
        console.error('Error loading boss list:', err);
        
        // Try to load boss list from Wiki as fallback
        try {
          const wikiBosses = await fetchWikiBossList();
          if (wikiBosses && wikiBosses.length > 0) {
            setBossList(wikiBosses);
            if (!selectedBoss) {
              setSelectedBoss(wikiBosses[0].name);
            }
            
            setDataSourceInfo(prev => ({
              ...prev,
              bossDataSource: DataSourceTypes.WIKI,
              lastWikiSync: new Date()
            }));
          } else {
            setError('Failed to load boss list. Please try again later.');
          }
        } catch (wikiErr) {
          console.error('Error loading boss list from wiki:', wikiErr);
          setError('Failed to load boss list from any source. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadBossList();
  }, [selectedBoss]);

  // Fetch slayer task recommendations for the group
  useEffect(() => {
    const fetchSlayerRecommendations = async () => {
      if (!group || !group.members || group.members.length === 0) {
        return;
      }
      
      try {
        const playerNames = group.members.map(member => member.name);
        const recommendations = await bossStrategyService.getSlayerTaskRecommendations(playerNames);
        setSlayerRecommendations(recommendations);
      } catch (err) {
        console.error('Error fetching slayer recommendations:', err);
      }
    };
    
    fetchSlayerRecommendations();
  }, [group]);

  // Load gear setups when boss or player changes
  useEffect(() => {
    const loadGearSetups = async () => {
      if (!selectedBoss || !activeMember) {
        return;
      }
      
      setLoading(true);
      
      try {
        // Get player stats from API
        const playerStats = await bossStrategyService.getPlayerStats(activeMember.name);
        
        // Update data source info for player stats
        setDataSourceInfo(prev => ({
          ...prev,
          playerStatsSource: DataSourceTypes.PLUGIN,
          lastPluginSync: new Date()
        }));
        
        // Get player bank items
        const bankItems = await bossStrategyService.getBankItems(activeMember.name);
        
        // Get optimal gear setups
        const setups = await bossStrategyService.getOptimalGearSetups(
          selectedBoss,
          playerStats,
          bankItems
        );
        
        setGearSetups(setups);
        
        // Set first setup as selected by default
        if (Object.keys(setups).length > 0) {
          setSelectedGearSetup(setups[Object.keys(setups)[0]]);
        }
        
        // Try to fetch WOM data in parallel
        fetchWomBossData(activeMember.name, selectedBoss);
        
        // Load wiki info for the boss using the wiki service from SyncContext
        const wikiData = await wikiService.getBossInfo(selectedBoss);
        setWikiInfo(wikiData);
        
        // Update data source info for wiki
        setDataSourceInfo(prev => ({
          ...prev,
          lastWikiSync: new Date()
        }));
      } catch (err) {
        console.error('Error loading gear setups:', err);
        
        // Try fetching player stats from Wise Old Man as fallback
        try {
          const womPlayerData = await wiseOldManService.getPlayer(activeMember.name);
          
          // If we got WOM data, update player stats source
          if (womPlayerData) {
            setDataSourceInfo(prev => ({
              ...prev,
              playerStatsSource: DataSourceTypes.WISE_OLD_MAN,
              lastWomSync: new Date()
            }));
            
            // Try to estimate simplified gear setups from WOM data
            const estimatedSetups = createEstimatedGearSetups(womPlayerData, selectedBoss);
            if (Object.keys(estimatedSetups).length > 0) {
              setGearSetups(estimatedSetups);
              setSelectedGearSetup(estimatedSetups[Object.keys(estimatedSetups)[0]]);
            }
          }
        } catch (womErr) {
          console.error('Error loading player data from Wise Old Man:', womErr);
        }
        
        // If wiki fetch failed, try again or show a fallback message
        if (!wikiInfo) {
          try {
            const wikiData = await wikiService.getBossInfo(selectedBoss);
            setWikiInfo(wikiData);
            setDataSourceInfo(prev => ({
              ...prev,
              lastWikiSync: new Date()
            }));
          } catch (wikiErr) {
            console.error('Error loading wiki data:', wikiErr);
            setWikiInfo({ error: 'Wiki information temporarily unavailable.' });
          }
        }
        
        // Only show error if we have no data from any source
        if (!wikiInfo && !womBossData && Object.keys(gearSetups).length === 0) {
          setError('Failed to load boss information from any source. Please try again later.');
        } else {
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadGearSetups();
  }, [selectedBoss, activeMember, wikiService, wiseOldManService]);

  /**
   * Fetch boss information from Wise Old Man API
   * @param {string} playerName - Player name to check
   * @param {string} bossName - Boss name to fetch
   */
  const fetchWomBossData = async (playerName, bossName) => {
    if (!wiseOldManService || !playerName || !bossName) return;
    
    try {
      // Convert boss name to WOM format (lowercase, hyphenated)
      const womBossName = bossName.toLowerCase().replace(/ /g, '-');
      
      // Fetch boss KCs from WOM API
      const bossKCs = await wiseOldManService.getPlayerBossKCs(playerName);
      
      // Find matching boss
      const bossData = bossKCs.find(boss => 
        boss.name.toLowerCase().replace(/ /g, '-') === womBossName
      );
      
      if (bossData) {
        setWomBossData(bossData);
        setDataSourceInfo(prev => ({
          ...prev,
          lastWomSync: new Date()
        }));
      }
    } catch (err) {
      console.error('Error fetching Wise Old Man boss data:', err);
    }
  };

  /**
   * Fetch boss list from OSRS Wiki as a fallback
   * @returns {Promise<Array>} - Array of boss objects
   */
  const fetchWikiBossList = async () => {
    if (!wikiService) return [];
    
    try {
      // Get list of bosses from wiki
      const bosses = await wikiService.searchBosses();
      
      // Transform to expected format
      return bosses.map((boss, index) => ({
        id: index + 1,
        name: boss.name,
        isSlayerMonster: boss.slayerMonster || false
      }));
    } catch (err) {
      console.error('Error fetching wiki boss list:', err);
      return [];
    }
  };

  /**
   * Create estimated gear setups based on Wise Old Man player data
   * @param {Object} playerData - Player data from Wise Old Man API
   * @param {string} bossName - Boss name
   * @returns {Object} - Estimated gear setups
   */
  const createEstimatedGearSetups = (playerData, bossName) => {
    // This is a simplified implementation
    // In a real implementation, you would use the player's stats to estimate
    // viable gear setups for the boss, considering skill levels
    
    // Get combat stats
    const combatStats = {
      attack: playerData.skills?.attack?.level || 1,
      strength: playerData.skills?.strength?.level || 1,
      defence: playerData.skills?.defence?.level || 1,
      ranged: playerData.skills?.ranged?.level || 1,
      magic: playerData.skills?.magic?.level || 1,
      prayer: playerData.skills?.prayer?.level || 1,
      hitpoints: playerData.skills?.hitpoints?.level || 10
    };
    
    // Simple logic to determine which combat styles are viable
    const setups = {};
    
    // Melee setup
    if (combatStats.attack >= 70 && combatStats.strength >= 70) {
      setups['Melee'] = {
        name: 'Melee Setup',
        effectiveness: Math.min(100, Math.max(50, combatStats.attack + combatStats.strength) / 2),
        dps: (combatStats.attack * 0.3 + combatStats.strength * 0.6) / 100 * 10,
        accuracy: combatStats.attack * 0.8,
        maxHit: Math.floor(combatStats.strength / 10 + 5)
      };
    }
    
    // Ranged setup
    if (combatStats.ranged >= 70) {
      setups['Ranged'] = {
        name: 'Ranged Setup',
        effectiveness: Math.min(100, Math.max(50, combatStats.ranged * 1.5) / 2),
        dps: combatStats.ranged * 0.9 / 100 * 10,
        accuracy: combatStats.ranged * 0.75,
        maxHit: Math.floor(combatStats.ranged / 10 + 3)
      };
    }
    
    // Magic setup
    if (combatStats.magic >= 70) {
      setups['Magic'] = {
        name: 'Magic Setup',
        effectiveness: Math.min(100, Math.max(50, combatStats.magic * 1.5) / 2),
        dps: combatStats.magic * 0.85 / 100 * 10,
        accuracy: combatStats.magic * 0.85,
        maxHit: Math.floor(combatStats.magic / 10 + 2)
      };
    }
    
    return setups;
  };

  // Handle boss selection
  const handleBossSelect = (event) => {
    setSelectedBoss(event.target.value);
    setWomBossData(null); // Reset WOM data when boss changes
  };

  // Handle player selection
  const handlePlayerSelect = (event) => {
    const selectedMember = group.members.find(member => member.name === event.target.value);
    setActiveMember(selectedMember);
    setWomBossData(null); // Reset WOM data when player changes
  };

  // Handle gear setup selection
  const handleGearSetupSelect = (setupName) => {
    setSelectedGearSetup(gearSetups[setupName]);
  };

  // Toggle showing only slayer bosses
  const toggleShowSlayerOnly = () => {
    setShowSlayerOnly(!showSlayerOnly);
  };

  /**
   * Get current data source status for the DataSourcesPanel
   */
  const getDataSources = () => {
    return getDataSourcesStatus(syncState, wikiState, womState);
  };

  /**
   * Get the appropriate data source badge for the specified data type
   * @param {string} dataType - Type of data (player, boss, etc.)
   * @returns {Object} - Badge configuration
   */
  const getSourceBadge = (dataType) => {
    switch(dataType) {
      case 'boss':
        return dataSourceInfo.bossDataSource ? 
          DataSourceBadges[dataSourceInfo.bossDataSource] : null;
      case 'player':
        return dataSourceInfo.playerStatsSource ? 
          DataSourceBadges[dataSourceInfo.playerStatsSource] : null;
      case 'wiki':
        return wikiInfo ? DataSourceBadges[DataSourceTypes.WIKI] : null;
      case 'wom':
        return womBossData ? DataSourceBadges[DataSourceTypes.WISE_OLD_MAN] : null;
      default:
        return null;
    }
  };

  // Filtered boss list based on slayer toggle
  const filteredBossList = showSlayerOnly
    ? bossList.filter(boss => boss.isSlayerMonster)
    : bossList;

  // Loading state
  if (loading && !selectedBoss) {
    return (
      <Card className="boss-strategy-panel">
        <Card.Body className="text-center">
          <Spinner animation="border" role="status" className="osrs-spinner">
            <span className="visually-hidden">Loading boss data...</span>
          </Spinner>
          <p className="mt-3">Loading boss data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="boss-strategy-panel">
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="boss-strategy-panel">
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              Boss Strategies
              {getSourceBadge('boss') && <DataSourceBadge badge={getSourceBadge('boss')} />}
            </h5>
          </div>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => {
              performSync(true);
              if (activeMember && selectedBoss) {
                fetchWomBossData(activeMember.name, selectedBoss);
              }
            }}
            disabled={syncState.syncInProgress}
            title="Refresh player data"
          >
            {syncState.syncInProgress ? (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              <i className="bi bi-arrow-clockwise"></i>
            )}
          </Button>
        </Card.Header>
        <Card.Body>
          {/* Boss and Player Selection */}
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Select Boss</Form.Label>
                <Form.Select 
                  value={selectedBoss || ''} 
                  onChange={handleBossSelect}
                  className="boss-select"
                >
                  {filteredBossList.map(boss => (
                    <option key={boss.id} value={boss.name}>
                      {boss.name} {boss.isSlayerMonster && '(Slayer)'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Check 
                type="checkbox"
                id="show-slayer-only"
                label="Show Slayer Bosses Only" 
                checked={showSlayerOnly}
                onChange={toggleShowSlayerOnly}
                className="mt-2"
              />
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Select Player</Form.Label>
                <Form.Select 
                  value={activeMember?.name || ''} 
                  onChange={handlePlayerSelect}
                  className="player-select"
                >
                  {group?.members?.map(member => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Boss Info and Strategies */}
          {selectedBoss && (
            <Tabs 
              activeKey={activeTab} 
              onSelect={k => setActiveTab(k)}
              className="mb-4 boss-tabs"
            >
              <Tab eventKey="gear" title="Gear Setups">
                <div className="gear-setups-container mt-3">
                  {/* Player Stats from Wise Old Man */}
                  {womBossData && (
                    <div className="wom-stats-container mb-4">
                      <h6 className="data-source-header">
                        <i className="bi bi-graph-up me-2"></i>
                        Player Stats
                        <DataSourceBadge badge={getSourceBadge('wom')} />
                      </h6>
                      <Row>
                        <Col md={4}>
                          <div className="stat-item">
                            <span className="stat-label">Kill Count:</span>
                            <span className="stat-value">{womBossData.kills.toLocaleString()}</span>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="stat-item">
                            <span className="stat-label">Rank:</span>
                            <span className="stat-value">{womBossData.rank.toLocaleString()}</span>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="stat-item">
                            <span className="stat-label">Last Updated:</span>
                            <span className="stat-value">
                              {new Date(womBossData.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  )}
                  
                  {Object.keys(gearSetups).length > 0 ? (
                    <>
                      <div className="gear-setup-list mb-3">
                        {Object.keys(gearSetups).map(setupName => (
                          <Button 
                            key={setupName}
                            variant={selectedGearSetup === gearSetups[setupName] ? "primary" : "outline-primary"}
                            onClick={() => handleGearSetupSelect(setupName)}
                            className="me-2 mb-2 setup-button"
                          >
                            {setupName}
                          </Button>
                        ))}
                      </div>
                      
                      {selectedGearSetup && (
                        <div className="selected-gear-setup">
                          <h4 className="d-flex align-items-center">
                            {selectedGearSetup.name}
                            {getSourceBadge('player') && <DataSourceBadge badge={getSourceBadge('player')} />}
                          </h4>
                          <div className="setup-details">
                            <div className="gear-grid">
                              {/* Equipment display would be here */}
                              {/* Simplified for this implementation */}
                              <div className="gear-placeholder">
                                <p className="text-center">Gear display would go here</p>
                                <small>DPS: {selectedGearSetup.dps?.toFixed(2) || 'N/A'}</small>
                              </div>
                            </div>
                            <div className="setup-stats">
                              <h5>Effectiveness: {selectedGearSetup.effectiveness}%</h5>
                              <Table bordered size="sm" className="stats-table">
                                <thead>
                                  <tr>
                                    <th>Stat</th>
                                    <th>Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>DPS</td>
                                    <td>{selectedGearSetup.dps?.toFixed(2) || 'N/A'}</td>
                                  </tr>
                                  <tr>
                                    <td>Accuracy</td>
                                    <td>{selectedGearSetup.accuracy?.toFixed(2) || 'N/A'}%</td>
                                  </tr>
                                  <tr>
                                    <td>Max Hit</td>
                                    <td>{selectedGearSetup.maxHit || 'N/A'}</td>
                                  </tr>
                                </tbody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Alert variant="info">
                      No gear setups available for this boss and player combination.
                    </Alert>
                  )}
                </div>
              </Tab>
              
              <Tab eventKey="strategies" title="Fight Mechanics">
                <div className="boss-strategies mt-3">
                  {wikiInfo ? (
                    <>
                      <div className="boss-info mb-4">
                        <h4 className="d-flex align-items-center">
                          Boss Information
                          {getSourceBadge('wiki') && <DataSourceBadge badge={getSourceBadge('wiki')} />}
                        </h4>
                        <Table bordered className="boss-info-table">
                          <tbody>
                            <tr>
                              <td>Combat Level</td>
                              <td>{wikiInfo.combatLevel}</td>
                            </tr>
                            <tr>
                              <td>Hitpoints</td>
                              <td>{wikiInfo.hitpoints}</td>
                            </tr>
                            <tr>
                              <td>Weakness</td>
                              <td>{wikiInfo.weakness || 'None'}</td>
                            </tr>
                            <tr>
                              <td>Attack Styles</td>
                              <td>{wikiInfo.attackStyles?.join(', ') || 'Unknown'}</td>
                            </tr>
                            <tr>
                              <td>Location</td>
                              <td>{wikiInfo.location || 'Various'}</td>
                            </tr>
                          </tbody>
                        </Table>
                        
                        {wikiInfo.mechanics && (
                          <div className="boss-mechanics mt-4">
                            <h5>Mechanics</h5>
                            <ul className="mechanics-list">
                              {wikiInfo.mechanics.map((mechanic, index) => (
                                <li key={index}>{mechanic}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {wikiInfo.recommendations && (
                          <div className="boss-recommendations mt-4">
                            <h5>Recommendations</h5>
                            <ul className="recommendations-list">
                              {wikiInfo.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <a 
                          href={`https://oldschool.runescape.wiki/w/${encodeURIComponent(selectedBoss)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wiki-link mt-3 d-inline-block"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          View on OSRS Wiki
                        </a>
                      </div>
                    </>
                  ) : (
                    <Alert variant="info">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      No wiki information available for this boss.
                    </Alert>
                  )}
                </div>
              </Tab>
              
              <Tab eventKey="slayer" title="Slayer Info">
                <div className="slayer-info mt-3">
                  {slayerRecommendations.length > 0 ? (
                    <>
                      <h4>Slayer Boss Recommendations</h4>
                      <p className="mb-3">
                        Based on current slayer tasks and levels of group members.
                      </p>
                      
                      <Table striped bordered className="slayer-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Current Task</th>
                            <th>Recommended Boss</th>
                            <th>Requirements Met</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slayerRecommendations.map((rec, index) => (
                            <tr key={index}>
                              <td>{rec.memberName}</td>
                              <td>
                                {rec.currentTask || 'None'}
                                {rec.quantity && ` (${rec.quantity})`}
                              </td>
                              <td>{rec.recommendedBoss || 'None'}</td>
                              <td>
                                {rec.requirementsMet ? (
                                  <Badge bg="success">Yes</Badge>
                                ) : (
                                  <Badge bg="danger">No</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  ) : (
                    <Alert variant="info">
                      <i className="bi bi-info-circle-fill me-2"></i>
                      No slayer task recommendations available. Group members may need to get slayer tasks first.
                    </Alert>
                  )}
                </div>
              </Tab>
            </Tabs>
          )}
          
          {/* Data Sources Panel */}
          <DataSourcesPanel sources={getDataSources()} />
        </Card.Body>
      </Card>
    </div>
  );
};

export default BossStrategyPanel;
