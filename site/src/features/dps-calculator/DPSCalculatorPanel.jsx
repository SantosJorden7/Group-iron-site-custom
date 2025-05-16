import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Form, Row, Col, Table, Tabs, Tab, Spinner, Alert, Badge } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext.js';
import { useSync } from '../../contexts/SyncContext.js';
import dpsCalculatorService from './dps-calculator-service';
import './DPSCalculatorPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * DPS Calculator Panel Component
 * Calculates and compares DPS for different gear setups against bosses/monsters
 * Integrates data from multiple sources: Plugin, Wise Old Man, and Wiki
 */
const DPSCalculatorPanel = () => {
  const { group, activeMember, setActiveMember } = useContext(GroupContext);
  const { syncState, performSync, wikiService, womState, wiseOldManService } = useSync();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  
  // Monster selection
  const [monsterCategories, setMonsterCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [monsters, setMonsters] = useState([]);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [monsterDetails, setMonsterDetails] = useState(null);
  const [loadingMonsterDetails, setLoadingMonsterDetails] = useState(false);
  
  // Player selection
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [secondPlayer, setSecondPlayer] = useState(null);
  
  // Options
  const [usePrayers, setUsePrayers] = useState(true);
  const [usePotions, setUsePotions] = useState(true);
  const [specMode, setSpecMode] = useState(false);
  
  // Results
  const [dpsResults, setDpsResults] = useState(null);
  const [compareResults, setCompareResults] = useState(null);
  
  // Multi-source data integration
  const [womPlayerData, setWomPlayerData] = useState({});
  const [womMonsterData, setWomMonsterData] = useState({});
  const [dataSourceInfo, setDataSourceInfo] = useState({
    playerDataSource: DataSourceTypes.PLUGIN,
    monsterDataSource: DataSourceTypes.PLUGIN,
    equipmentDataSource: DataSourceTypes.PLUGIN,
    monsterStatsSource: DataSourceTypes.PLUGIN,
    wikiDataSource: DataSourceTypes.WIKI,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null
  });
  
  // Load data on component mount
  useEffect(() => {
    loadMonsterCategories();
    
    // Set default selected player if group is loaded
    if (group?.members?.length > 0 && !selectedPlayer) {
      if (activeMember) {
        setSelectedPlayer(activeMember);
      } else {
        setSelectedPlayer(group.members[0]);
        setActiveMember(group.members[0]);
      }
    }
    
    // Trigger sync when component mounts
    if (!syncState.syncInProgress) {
      performSync(false); // Background sync
    }
  }, [group]);
  
  // When sync state changes, update data sources
  useEffect(() => {
    if (!syncState.syncInProgress) {
      setDataSourceInfo(prev => ({
        ...prev,
        lastPluginSync: new Date()
      }));
      
      // If we have WOM service available, try to fetch WOM data
      if (wiseOldManService && group?.members) {
        fetchWomPlayerData();
      }
    }
  }, [syncState.lastSyncTime]);
  
  /**
   * Fetch player data from Wise Old Man API
   */
  const fetchWomPlayerData = async () => {
    if (!wiseOldManService || !group?.members) return;
    
    try {
      const playerData = {};
      
      // For each group member, fetch their WOM stats
      for (const member of group.members) {
        const player = await wiseOldManService.getPlayer(member.name);
        
        if (player) {
          playerData[member.name] = {
            name: member.name,
            stats: player.latestSnapshot,
            combat: calculateCombatLevel(player.latestSnapshot),
            equipment: [], // WOM doesn't track equipment
            data_source: DataSourceTypes.WISE_OLD_MAN
          };
        }
      }
      
      if (Object.keys(playerData).length > 0) {
        setWomPlayerData(playerData);
        setDataSourceInfo(prev => ({
          ...prev,
          lastWomSync: new Date()
        }));
      }
    } catch (err) {
      console.error('Failed to fetch Wise Old Man player data:', err);
    }
  };
  
  /**
   * Calculate combat level from player stats
   * @param {Object} stats - Player stats
   * @returns {number} - Combat level
   */
  const calculateCombatLevel = (stats) => {
    if (!stats) return 3;
    
    const attack = stats.attack?.level || 1;
    const strength = stats.strength?.level || 1;
    const defence = stats.defence?.level || 1;
    const hitpoints = stats.hitpoints?.level || 10;
    const prayer = stats.prayer?.level || 1;
    const ranged = stats.ranged?.level || 1;
    const magic = stats.magic?.level || 1;
    
    const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
    const melee = 0.325 * (attack + strength);
    const range = 0.325 * (Math.floor(3 * ranged / 2));
    const mage = 0.325 * (Math.floor(3 * magic / 2));
    
    return Math.floor(base + Math.max(melee, range, mage));
  };
  
  // Load monster categories
  const loadMonsterCategories = async () => {
    setLoading(true);
    try {
      const categories = await dpsCalculatorService.getMonsterCategories();
      setMonsterCategories(categories);
      
      if (Object.keys(categories).length > 0) {
        // Set first category as default
        const firstCategory = Object.keys(categories)[0];
        setSelectedCategory(firstCategory);
        setMonsters(categories[firstCategory]);
      }
    } catch (err) {
      console.error('Error loading monster categories:', err);
      setError('Failed to load monster data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load monster details from wiki when monster selection changes
  useEffect(() => {
    if (selectedMonster) {
      loadMonsterDetails();
    } else {
      setMonsterDetails(null);
    }
  }, [selectedMonster]);
  
  // Load monster details from wiki
  const loadMonsterDetails = async () => {
    if (!selectedMonster) return;
    
    setLoadingMonsterDetails(true);
    try {
      // First get basic monster stats from calculator service
      const basicDetails = await dpsCalculatorService.getMonsterStats(selectedMonster);
      
      // Set monster data source as plugin
      setDataSourceInfo(prev => ({
        ...prev,
        monsterDataSource: DataSourceTypes.PLUGIN,
        monsterStatsSource: DataSourceTypes.PLUGIN
      }));
      
      // Then enrich with wiki data if available
      try {
        if (wikiService) {
          const wikiData = await wikiService.getMonsterInfo(selectedMonster);
          
          // Update data source info for wiki
          setDataSourceInfo(prev => ({
            ...prev,
            wikiDataSource: DataSourceTypes.WIKI,
            lastWikiSync: new Date()
          }));
          
          // Merge wiki data with basic details
          setMonsterDetails({
            ...basicDetails,
            wikiData: wikiData,
            imageUrl: wikiData?.image_url || null,
            description: wikiData?.description || basicDetails.description,
            weaknesses: wikiData?.weaknesses || basicDetails.weaknesses,
            recommendedItems: wikiData?.recommended_items || [],
            drops: wikiData?.notable_drops || [],
            data_sources: {
              stats: DataSourceTypes.PLUGIN,
              details: DataSourceTypes.WIKI
            }
          });
        } else {
          console.warn('WikiService not available through SyncContext');
          setMonsterDetails({
            ...basicDetails,
            data_sources: {
              stats: DataSourceTypes.PLUGIN,
              details: null
            }
          });
        }
      } catch (wikiErr) {
        // If wiki lookup fails, still display basic details
        console.warn('Could not fetch wiki data for monster:', wikiErr);
        setMonsterDetails({
          ...basicDetails,
          data_sources: {
            stats: DataSourceTypes.PLUGIN,
            details: null
          }
        });
      }
    } catch (err) {
      console.error('Error loading monster details:', err);
      setError(`Failed to load details for ${selectedMonster}. Please try again.`);
      
      // Try to use wiki data directly if plugin data fails
      if (wikiService) {
        try {
          const wikiData = await wikiService.getMonsterInfo(selectedMonster);
          
          if (wikiData) {
            // Update data source info
            setDataSourceInfo(prev => ({
              ...prev,
              monsterDataSource: DataSourceTypes.WIKI,
              monsterStatsSource: DataSourceTypes.WIKI,
              wikiDataSource: DataSourceTypes.WIKI,
              lastWikiSync: new Date()
            }));
            
            // Convert wiki data to monster details format
            const monsterStats = {
              name: selectedMonster,
              combat_level: wikiData.combat_level || 0,
              hitpoints: wikiData.hitpoints || 100,
              attack: wikiData.attack_level || 1,
              strength: wikiData.strength_level || 1,
              defence: wikiData.defence_level || 1,
              magic: wikiData.magic_level || 1,
              ranged: wikiData.ranged_level || 1,
              attack_speed: wikiData.attack_speed || 4,
              aggressive_style: wikiData.attack_style || 'crush',
              defensive_stats: {
                stab: wikiData.stab_defence || 0,
                slash: wikiData.slash_defence || 0,
                crush: wikiData.crush_defence || 0,
                magic: wikiData.magic_defence || 0,
                ranged: wikiData.ranged_defence || 0
              },
              aggressive_stats: {
                attack: wikiData.attack_bonus || 0,
                strength: wikiData.strength_bonus || 0,
                magic: wikiData.magic_bonus || 0,
                magic_damage: wikiData.magic_damage || 0,
                ranged: wikiData.ranged_bonus || 0,
                ranged_strength: wikiData.ranged_strength || 0
              }
            };
            
            setMonsterDetails({
              ...monsterStats,
              wikiData: wikiData,
              imageUrl: wikiData.image_url || null,
              description: wikiData.description || '',
              weaknesses: wikiData.weaknesses || [],
              recommendedItems: wikiData.recommended_items || [],
              drops: wikiData.notable_drops || [],
              data_sources: {
                stats: DataSourceTypes.WIKI,
                details: DataSourceTypes.WIKI
              }
            });
            
            // Clear error since we successfully retrieved wiki data
            setError(null);
          }
        } catch (wikiErr) {
          console.error('Failed to load monster details from wiki:', wikiErr);
        }
      }
    } finally {
      setLoadingMonsterDetails(false);
    }
  };
  
  // Calculate DPS for selected player against selected monster
  const calculateDPS = async () => {
    if (!selectedPlayer || !selectedMonster) {
      setError('Please select both a player and a monster to calculate DPS.');
      return;
    }
    
    setCalculating(true);
    setError(null);
    try {
      const options = {
        usePrayers,
        usePotions,
        specMode
      };
      
      // Determine data source for player stats
      let playerSource = DataSourceTypes.PLUGIN;
      let playerData = selectedPlayer;
      
      // If plugin data is not available, try to use WOM data
      if (!playerData.stats || Object.keys(playerData.stats).length === 0) {
        if (womPlayerData[selectedPlayer.name]) {
          playerData = womPlayerData[selectedPlayer.name];
          playerSource = DataSourceTypes.WISE_OLD_MAN;
          
          // Update data source info
          setDataSourceInfo(prev => ({
            ...prev,
            playerDataSource: DataSourceTypes.WISE_OLD_MAN,
            equipmentDataSource: DataSourceTypes.PLUGIN // We still rely on plugin for equipment
          }));
        }
      } else {
        // Update data source info for plugin
        setDataSourceInfo(prev => ({
          ...prev,
          playerDataSource: DataSourceTypes.PLUGIN,
          equipmentDataSource: DataSourceTypes.PLUGIN
        }));
      }
      
      const results = await dpsCalculatorService.calculateDPS(
        playerData.name,
        selectedMonster,
        options
      );
      
      // Add data source info to results
      results.data_sources = {
        player: playerSource,
        monster: monsterDetails?.data_sources?.stats || DataSourceTypes.PLUGIN,
        equipment: DataSourceTypes.PLUGIN
      };
      
      setDpsResults(results);
      
      if (compareMode && secondPlayer) {
        // Determine data source for second player
        let secondPlayerSource = DataSourceTypes.PLUGIN;
        let secondPlayerData = secondPlayer;
        
        // If plugin data is not available, try to use WOM data
        if (!secondPlayerData.stats || Object.keys(secondPlayerData.stats).length === 0) {
          if (womPlayerData[secondPlayer.name]) {
            secondPlayerData = womPlayerData[secondPlayer.name];
            secondPlayerSource = DataSourceTypes.WISE_OLD_MAN;
          }
        }
        
        const compareResults = await dpsCalculatorService.calculateDPS(
          secondPlayerData.name,
          selectedMonster,
          options
        );
        
        // Add data source info to compare results
        compareResults.data_sources = {
          player: secondPlayerSource,
          monster: monsterDetails?.data_sources?.stats || DataSourceTypes.PLUGIN,
          equipment: DataSourceTypes.PLUGIN
        };
        
        setCompareResults(compareResults);
      } else {
        setCompareResults(null);
      }
    } catch (err) {
      console.error('Error calculating DPS:', err);
      setError('Failed to calculate DPS. Please try again.');
    } finally {
      setCalculating(false);
    }
  };
  
  /**
   * Get current data source status for use in DataSourcesPanel
   */
  const getDataSources = () => {
    return getDataSourcesStatus(syncState, wikiService ? { connected: true } : null, womState);
  };
  
  /**
   * Get the appropriate data source badge for the specified data type
   * @param {string} dataType - Type of data (player, monster, equipment, etc.)
   * @returns {Object} - Badge configuration
   */
  const getSourceBadge = (dataType) => {
    switch(dataType) {
      case 'player':
        return dataSourceInfo.playerDataSource ? 
          DataSourceBadges[dataSourceInfo.playerDataSource] : null;
      case 'monster':
        return dataSourceInfo.monsterDataSource ? 
          DataSourceBadges[dataSourceInfo.monsterDataSource] : null;
      case 'equipment':
        return dataSourceInfo.equipmentDataSource ? 
          DataSourceBadges[dataSourceInfo.equipmentDataSource] : null;
      case 'wiki':
        return dataSourceInfo.wikiDataSource ? 
          DataSourceBadges[dataSourceInfo.wikiDataSource] : null;
      default:
        return null;
    }
  };
  
  // Format a number with commas and optional decimal places
  const formatNumber = (num, decimalPlaces = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  };
  
  return (
    <Card className="dps-calculator-panel">
      <Card.Header className="osrs-header">
        <h4>
          <i className="bi bi-calculator me-2"></i>
          DPS Calculator
        </h4>
        <div>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => {
              loadMonsterCategories();
              performSync(false);
            }}
            disabled={loading || syncState.syncInProgress}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
            {syncState.syncInProgress && (
              <Spinner animation="border" size="sm" className="ms-1" />
            )}
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        {/* Player Selection */}
        <div className="mb-4">
          <h5 className="section-header">Select Player</h5>
          <Row className="align-items-end">
            <Col sm={6} md={4}>
              <Form.Group>
                <Form.Label>Player:</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Select
                    value={selectedPlayer ? selectedPlayer.name : ''}
                    onChange={(e) => {
                      const player = group.members.find(m => m.name === e.target.value);
                      setSelectedPlayer(player);
                      setActiveMember(player);
                    }}
                    disabled={loading}
                  >
                    <option value="">Select a player</option>
                    {group?.members?.map(member => (
                      <option key={member.name} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </Form.Select>
                  {selectedPlayer && (
                    <div className="ms-2">
                      <DataSourceBadge badge={getSourceBadge('player')} />
                    </div>
                  )}
                </div>
              </Form.Group>
            </Col>
            <Col sm={6} md={4}>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="compare-mode"
                  label="Compare with another player"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                />
              </Form.Group>
            </Col>
            {compareMode && (
              <Col sm={6} md={4}>
                <Form.Group>
                  <Form.Label>Compare with:</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Select
                      value={secondPlayer ? secondPlayer.name : ''}
                      onChange={(e) => {
                        const player = group.members.find(m => m.name === e.target.value);
                        setSecondPlayer(player);
                      }}
                      disabled={loading}
                    >
                      <option value="">Select a player</option>
                      {group?.members?.filter(m => m.name !== selectedPlayer?.name).map(member => (
                        <option key={member.name} value={member.name}>
                          {member.name}
                        </option>
                      ))}
                    </Form.Select>
                    {secondPlayer && (
                      <div className="ms-2">
                        <DataSourceBadge 
                          badge={secondPlayer && womPlayerData[secondPlayer.name] ? 
                            DataSourceBadges[DataSourceTypes.WISE_OLD_MAN] : 
                            DataSourceBadges[DataSourceTypes.PLUGIN]} 
                        />
                      </div>
                    )}
                  </div>
                </Form.Group>
              </Col>
            )}
          </Row>
        </div>
        
        {/* Monster Selection */}
        <div className="mb-4">
          <h5 className="section-header">Select Monster</h5>
          <Row>
            <Col sm={6} md={5}>
              <Form.Group className="mb-3">
                <Form.Label>Category:</Form.Label>
                <Form.Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setMonsters(monsterCategories[e.target.value] || []);
                    setSelectedMonster(null);
                    setMonsterDetails(null);
                  }}
                  disabled={loading}
                >
                  <option value="">Select a category</option>
                  {Object.keys(monsterCategories).map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col sm={6} md={7}>
              <Form.Group className="mb-3">
                <Form.Label>Monster:</Form.Label>
                <div className="d-flex align-items-center">
                  <Form.Select
                    value={selectedMonster || ''}
                    onChange={(e) => setSelectedMonster(e.target.value)}
                    disabled={loading || !selectedCategory}
                  >
                    <option value="">Select a monster</option>
                    {monsters.map(monster => (
                      <option key={monster} value={monster}>
                        {monster}
                      </option>
                    ))}
                  </Form.Select>
                  {monsterDetails && (
                    <div className="ms-2">
                      <DataSourceBadge badge={getSourceBadge('monster')} />
                    </div>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </div>

        {/* Options */}
        <div className="mb-4">
          <h5 className="section-header">Options</h5>
          <Row>
            <Col xs={4}>
              <Form.Check
                type="switch"
                id="use-prayers"
                label="Use Prayers"
                checked={usePrayers}
                onChange={(e) => setUsePrayers(e.target.checked)}
              />
            </Col>
            <Col xs={4}>
              <Form.Check
                type="switch"
                id="use-potions"
                label="Use Potions"
                checked={usePotions}
                onChange={(e) => setUsePotions(e.target.checked)}
              />
            </Col>
            <Col xs={4}>
              <Form.Check
                type="switch"
                id="spec-mode"
                label="Special Attack"
                checked={specMode}
                onChange={(e) => setSpecMode(e.target.checked)}
              />
            </Col>
          </Row>
        </div>
        
        {/* Calculate Button */}
        <div className="d-grid mb-4">
          <Button
            variant="primary"
            size="lg"
            onClick={calculateDPS}
            disabled={calculating || !selectedPlayer || !selectedMonster}
            className="osrs-button"
          >
            {calculating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Calculating...
              </>
            ) : (
              'Calculate DPS'
            )}
          </Button>
        </div>
        
        {/* Monster Details */}
        {monsterDetails && (
          <div className="monster-details mb-4">
            <h5 className="section-header">
              Monster Details
              {monsterDetails.data_sources && (
                <div className="d-inline-block ms-2">
                  <DataSourceBadge 
                    badge={DataSourceBadges[monsterDetails.data_sources.stats]} 
                    small
                  />
                  {monsterDetails.data_sources.details && (
                    <DataSourceBadge 
                      badge={DataSourceBadges[monsterDetails.data_sources.details]} 
                      small 
                      className="ms-1"
                    />
                  )}
                </div>
              )}
            </h5>
            <Row>
              {monsterDetails.imageUrl && (
                <Col md={3} className="text-center mb-3">
                  <img 
                    src={monsterDetails.imageUrl} 
                    alt={monsterDetails.name} 
                    className="monster-image"
                    style={{ maxWidth: '100%', maxHeight: '200px' }}
                  />
                </Col>
              )}
              <Col md={monsterDetails.imageUrl ? 9 : 12}>
                <Table bordered size="sm" className="monster-stats-table">
                  <tbody>
                    <tr>
                      <th>Name</th>
                      <td>{monsterDetails.name}</td>
                      <th>Combat Level</th>
                      <td>{monsterDetails.combat_level}</td>
                    </tr>
                    <tr>
                      <th>Hitpoints</th>
                      <td>{monsterDetails.hitpoints}</td>
                      <th>Attack Speed</th>
                      <td>{monsterDetails.attack_speed}</td>
                    </tr>
                    <tr>
                      <th>Attack</th>
                      <td>{monsterDetails.attack}</td>
                      <th>Strength</th>
                      <td>{monsterDetails.strength}</td>
                    </tr>
                    <tr>
                      <th>Defence</th>
                      <td>{monsterDetails.defence}</td>
                      <th>Attack Style</th>
                      <td>{monsterDetails.aggressive_style}</td>
                    </tr>
                    <tr>
                      <th>Magic</th>
                      <td>{monsterDetails.magic}</td>
                      <th>Ranged</th>
                      <td>{monsterDetails.ranged}</td>
                    </tr>
                  </tbody>
                </Table>
                
                {monsterDetails.description && (
                  <div className="monster-description mt-2">
                    <h6>Description:</h6>
                    <p>{monsterDetails.description}</p>
                  </div>
                )}
                
                {monsterDetails.weaknesses && monsterDetails.weaknesses.length > 0 && (
                  <div className="monster-weaknesses mt-2">
                    <h6>Weaknesses:</h6>
                    <div>
                      {monsterDetails.weaknesses.map((weakness, index) => (
                        <Badge bg="info" key={index} className="me-1 mb-1">{weakness}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          </div>
        )}
        
        {/* DPS Results */}
        {dpsResults && (
          <div className="dps-results mb-4">
            <h5 className="section-header">
              DPS Results
              {dpsResults.data_sources && (
                <div className="d-inline-block ms-2">
                  <DataSourceBadge 
                    badge={DataSourceBadges[dpsResults.data_sources.player]} 
                    small
                  />
                </div>
              )}
            </h5>
            
            <Tabs defaultActiveKey="overview" id="dps-tabs" className="mb-3">
              <Tab eventKey="overview" title="Overview">
                <Row>
                  <Col md={compareResults ? 6 : 12}>
                    <div className="player-dps-card">
                      <h5 className="text-center">{dpsResults.player_name}</h5>
                      
                      <Table bordered className="dps-table">
                        <tbody>
                          <tr className="highlight-row">
                            <th>DPS</th>
                            <td className="text-end">{formatNumber(dpsResults.dps)}</td>
                          </tr>
                          <tr>
                            <th>Max Hit</th>
                            <td className="text-end">{dpsResults.max_hit}</td>
                          </tr>
                          <tr>
                            <th>Accuracy</th>
                            <td className="text-end">{(dpsResults.accuracy * 100).toFixed(2)}%</td>
                          </tr>
                          <tr>
                            <th>Time to Kill</th>
                            <td className="text-end">{formatNumber(dpsResults.time_to_kill)} seconds</td>
                          </tr>
                        </tbody>
                      </Table>
                      
                      <div className="text-center mt-2">
                        <div className="equipment-list">
                          {dpsResults.equipment && (
                            <div>
                              <h6>Equipment</h6>
                              <div className="d-flex justify-content-end mb-1">
                                <DataSourceBadge 
                                  badge={getSourceBadge('equipment')} 
                                  small
                                />
                              </div>
                              <ul className="list-unstyled equipment-items">
                                {Object.entries(dpsResults.equipment).map(([slot, item]) => (
                                  <li key={slot}>{slot}: {item || 'Empty'}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  {compareResults && (
                    <Col md={6}>
                      <div className="player-dps-card">
                        <h5 className="text-center">{compareResults.player_name}</h5>
                        
                        <Table bordered className="dps-table">
                          <tbody>
                            <tr className="highlight-row">
                              <th>DPS</th>
                              <td className="text-end">{formatNumber(compareResults.dps)}</td>
                            </tr>
                            <tr>
                              <th>Max Hit</th>
                              <td className="text-end">{compareResults.max_hit}</td>
                            </tr>
                            <tr>
                              <th>Accuracy</th>
                              <td className="text-end">{(compareResults.accuracy * 100).toFixed(2)}%</td>
                            </tr>
                            <tr>
                              <th>Time to Kill</th>
                              <td className="text-end">{formatNumber(compareResults.time_to_kill)} seconds</td>
                            </tr>
                          </tbody>
                        </Table>
                        
                        <div className="text-center mt-2">
                          <div className="equipment-list">
                            {compareResults.equipment && (
                              <div>
                                <h6>Equipment</h6>
                                <div className="d-flex justify-content-end mb-1">
                                  <DataSourceBadge 
                                    badge={compareResults.data_sources ? 
                                      DataSourceBadges[compareResults.data_sources.equipment] : 
                                      getSourceBadge('equipment')} 
                                    small
                                  />
                                </div>
                                <ul className="list-unstyled equipment-items">
                                  {Object.entries(compareResults.equipment).map(([slot, item]) => (
                                    <li key={slot}>{slot}: {item || 'Empty'}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Tab>
              
              <Tab eventKey="details" title="Detailed Stats">
                <Row>
                  <Col md={compareResults ? 6 : 12}>
                    <h6 className="text-center">{dpsResults.player_name}</h6>
                    <Table bordered size="sm" className="stats-table">
                      <thead>
                        <tr>
                          <th>Stat</th>
                          <th>Base</th>
                          <th>Boosted</th>
                          <th>Effective</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dpsResults.detailed_stats && Object.entries(dpsResults.detailed_stats).map(([stat, values]) => (
                          <tr key={stat}>
                            <th>{stat.charAt(0).toUpperCase() + stat.slice(1)}</th>
                            <td>{values.base}</td>
                            <td>{values.boosted}</td>
                            <td>{values.effective}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Col>
                  
                  {compareResults && (
                    <Col md={6}>
                      <h6 className="text-center">{compareResults.player_name}</h6>
                      <Table bordered size="sm" className="stats-table">
                        <thead>
                          <tr>
                            <th>Stat</th>
                            <th>Base</th>
                            <th>Boosted</th>
                            <th>Effective</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareResults.detailed_stats && Object.entries(compareResults.detailed_stats).map(([stat, values]) => (
                            <tr key={stat}>
                              <th>{stat.charAt(0).toUpperCase() + stat.slice(1)}</th>
                              <td>{values.base}</td>
                              <td>{values.boosted}</td>
                              <td>{values.effective}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                  )}
                </Row>
              </Tab>
              
              <Tab eventKey="comparisons" title="Comparisons" disabled={!compareResults}>
                {compareResults && (
                  <Table bordered className="comparison-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>{dpsResults.player_name}</th>
                        <th>{compareResults.player_name}</th>
                        <th>Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="highlight-row">
                        <th>DPS</th>
                        <td>{formatNumber(dpsResults.dps)}</td>
                        <td>{formatNumber(compareResults.dps)}</td>
                        <td className={dpsResults.dps >= compareResults.dps ? 'positive-diff' : 'negative-diff'}>
                          {formatNumber(dpsResults.dps - compareResults.dps)}
                          ({(((dpsResults.dps / compareResults.dps) - 1) * 100).toFixed(2)}%)
                        </td>
                      </tr>
                      <tr>
                        <th>Max Hit</th>
                        <td>{dpsResults.max_hit}</td>
                        <td>{compareResults.max_hit}</td>
                        <td className={dpsResults.max_hit >= compareResults.max_hit ? 'positive-diff' : 'negative-diff'}>
                          {dpsResults.max_hit - compareResults.max_hit}
                        </td>
                      </tr>
                      <tr>
                        <th>Accuracy</th>
                        <td>{(dpsResults.accuracy * 100).toFixed(2)}%</td>
                        <td>{(compareResults.accuracy * 100).toFixed(2)}%</td>
                        <td className={dpsResults.accuracy >= compareResults.accuracy ? 'positive-diff' : 'negative-diff'}>
                          {((dpsResults.accuracy - compareResults.accuracy) * 100).toFixed(2)}%
                        </td>
                      </tr>
                      <tr>
                        <th>Time to Kill</th>
                        <td>{formatNumber(dpsResults.time_to_kill)}s</td>
                        <td>{formatNumber(compareResults.time_to_kill)}s</td>
                        <td className={dpsResults.time_to_kill <= compareResults.time_to_kill ? 'positive-diff' : 'negative-diff'}>
                          {formatNumber(dpsResults.time_to_kill - compareResults.time_to_kill)}s
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                )}
              </Tab>
            </Tabs>
          </div>
        )}
        
        {/* Data Sources Panel */}
        <DataSourcesPanel
          dataSources={getDataSources()}
          currentSource={dataSourceInfo.playerDataSource || DataSourceTypes.PLUGIN}
          sourceBadge={getSourceBadge('player')}
        />
        
        {/* Wiki Attribution */}
        {monsterDetails?.wikiData && (
          <div className="wiki-attribution mt-3 text-center">
            <small className="text-muted">
              Monster data provided by the Old School RuneScape Wiki
              <DataSourceBadge 
                badge={DataSourceBadges[DataSourceTypes.WIKI]} 
                small 
                className="ms-1"
              />
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DPSCalculatorPanel;
