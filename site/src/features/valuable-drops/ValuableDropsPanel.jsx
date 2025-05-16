import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Table, Form, Row, Col, Alert, Spinner, Badge, Modal, Tabs, Tab, Pagination } from 'react-bootstrap';
import { GroupContext } from '../../contexts/GroupContext.js';
import { useSync } from '../../contexts/SyncContext.js';
import * as valuableDropsService from './valuable-drops-service';
import './ValuableDropsPanel.css';
import '../data-sync/multi-source.css';
import DataSourceBadge from '../data-sync/DataSourceBadge';
import DataSourcesPanel from '../data-sync/DataSourcesPanel';
import { getDataSourcesStatus, DataSourceBadges, DataSourceTypes } from '../data-sync/multi-source-utility';

/**
 * ValuableDropsPanel Component
 * Displays valuable item drops for the group with filtering and sorting options
 * Integrates data from multiple sources: Plugin, Wise Old Man, and Wiki
 */
const ValuableDropsPanel = () => {
  const { group } = useContext(GroupContext);
  const { wikiService, syncState, womState, performSync, wiseOldManService } = useSync();
  const [dropsData, setDropsData] = useState({ drops: [], pagination: { total_count: 0, offset: 0, limit: 20 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState(null);
  const [dropStats, setDropStats] = useState(null);
  const [filters, setFilters] = useState({
    member: '',
    minValue: '',
    maxValue: '',
    itemName: '',
    source: ''
  });
  const [sorting, setSorting] = useState({ field: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [newDropData, setNewDropData] = useState({
    member_name: '',
    item_id: '',
    item_name: '',
    item_value: '',
    item_quantity: '1',
    source_name: ''
  });
  
  // Additional state for multi-source data integration
  const [womDropsData, setWomDropsData] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState({
    currentSource: DataSourceTypes.PLUGIN,
    lastPluginSync: null,
    lastWomSync: null,
    lastWikiSync: null,
    dropsDataSource: null,
    itemInfoSource: null
  });

  // Fetch drops on component mount and when filters, sorting, or page changes
  useEffect(() => {
    fetchDrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sorting, page]);

  // Fetch drop statistics on mount and when data is synced
  useEffect(() => {
    if (!syncState.syncInProgress) {
      fetchDrops();
      fetchDropStats();
      
      // Also try to fetch from Wise Old Man if we have access
      if (wiseOldManService) {
        fetchWomDropsData();
      }
    }
  }, [syncState.lastSyncTime]);

  // Fetch drop statistics on mount
  useEffect(() => {
    fetchDropStats();
    
    // Try to fetch from Wise Old Man as a secondary source
    if (wiseOldManService) {
      fetchWomDropsData();
    }
  }, []);
  
  /**
   * Fetch drop data from Wise Old Man API
   */
  const fetchWomDropsData = async () => {
    if (!wiseOldManService || !group?.members) return;
    
    try {
      const womData = [];
      
      // For each group member, fetch their WOM achievements
      for (const member of group.members) {
        const achievements = await wiseOldManService.getPlayerAchievements(member.name, 'bossing');
        
        if (achievements && achievements.length > 0) {
          // Filter for collection log items and valuable uniques
          const valuableItems = achievements
            .filter(a => a.metric === 'collection_log' || a.metric.includes('unique'))
            .map(a => ({
              drop_id: `wom-${a.createdAt}-${a.id}`,
              member_name: member.name,
              item_name: a.name.replace('Obtained: ', '').replace(' unique', ''),
              item_value: 0, // WOM doesn't track values, will be enriched with wiki data
              item_quantity: 1,
              source_name: a.metric === 'collection_log' ? 'Collection Log' : a.metric.replace('_uniques', ''),
              timestamp: new Date(a.createdAt).toISOString(),
              data_source: DataSourceTypes.WISE_OLD_MAN
            }));
            
          womData.push(...valuableItems);
        }
      }
      
      // Sort by timestamp (most recent first)
      womData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setWomDropsData(womData);
      setDataSourceInfo(prev => ({
        ...prev,
        lastWomSync: new Date()
      }));
      
      // Enrich WOM data with wiki item prices
      if (wikiService && womData.length > 0) {
        enrichWomDataWithWikiPrices(womData);
      }
    } catch (err) {
      console.error('Failed to fetch Wise Old Man drops data:', err);
    }
  };
  
  /**
   * Enrich Wise Old Man data with wiki item prices
   * @param {Array} womData - Array of WOM drop data
   */
  const enrichWomDataWithWikiPrices = async (womData) => {
    try {
      // Create an array of item names to look up
      const itemNames = [...new Set(womData.map(drop => drop.item_name))];
      const priceData = await wikiService.getItemPrices(itemNames);
      
      if (priceData) {
        // Update WOM drop values with wiki prices
        const enrichedWomData = womData.map(drop => {
          const wikiPrice = priceData[drop.item_name] || 0;
          
          return {
            ...drop,
            item_value: wikiPrice,
            formatted_value: valuableDropsService.formatGp(wikiPrice),
            total_value: wikiPrice * drop.item_quantity,
            formatted_total_value: valuableDropsService.formatGp(wikiPrice * drop.item_quantity),
            data_source: DataSourceTypes.WISE_OLD_MAN,
            price_source: DataSourceTypes.WIKI
          };
        });
        
        setWomDropsData(enrichedWomData);
        setDataSourceInfo(prev => ({
          ...prev,
          lastWikiSync: new Date(),
          itemInfoSource: DataSourceTypes.WIKI
        }));
      }
    } catch (err) {
      console.error('Failed to enrich WOM data with wiki prices:', err);
    }
  };

  const fetchDrops = async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = dropsData.pagination.limit;
      const offset = (page - 1) * limit;
      const data = await valuableDropsService.getValuableDrops(filters, sorting, limit, offset);
      
      // Update data source info for plugin data
      setDataSourceInfo(prev => ({
        ...prev,
        currentSource: DataSourceTypes.PLUGIN,
        dropsDataSource: DataSourceTypes.PLUGIN,
        lastPluginSync: new Date()
      }));
      
      // If wiki service is available, try to update item prices
      if (wikiService && data.drops.length > 0) {
        try {
          // Create an array of item names to look up
          const itemNames = [...new Set(data.drops.map(drop => drop.item_name))];
          const priceData = await wikiService.getItemPrices(itemNames);
          
          // Update drop values with current prices if different
          if (priceData) {
            data.drops = data.drops.map(drop => {
              const currentPrice = priceData[drop.item_name] || drop.item_value;
              const priceDifference = currentPrice - drop.item_value;
              const totalValue = drop.item_value * drop.item_quantity;
              const currentTotalValue = currentPrice * drop.item_quantity;
              
              return {
                ...drop,
                current_value: currentPrice,
                current_total_value: currentTotalValue,
                price_difference: priceDifference,
                price_difference_total: currentTotalValue - totalValue,
                formatted_current_value: valuableDropsService.formatGp(currentPrice),
                formatted_current_total_value: valuableDropsService.formatGp(currentTotalValue),
                price_trend: priceDifference > 0 ? 'up' : priceDifference < 0 ? 'down' : 'stable'
              };
            });
            
            // Update data source info for wiki price data
            setDataSourceInfo(prev => ({
              ...prev,
              itemInfoSource: DataSourceTypes.WIKI,
              lastWikiSync: new Date()
            }));
          }
        } catch (err) {
          console.warn('Failed to fetch updated prices from wiki:', err);
        }
      }
      
      setDropsData(data);
    } catch (err) {
      console.error('Failed to load valuable drops from plugin:', err);
      
      // Fallback to WOM data if available
      if (womDropsData && womDropsData.length > 0) {
        // Create a paginated version of WOM data
        const limit = dropsData.pagination.limit;
        const offset = (page - 1) * limit;
        const totalCount = womDropsData.length;
        
        // Apply filters to WOM data
        let filteredWomData = [...womDropsData];
        
        if (filters.member) {
          filteredWomData = filteredWomData.filter(drop => 
            drop.member_name.toLowerCase().includes(filters.member.toLowerCase())
          );
        }
        
        if (filters.itemName) {
          filteredWomData = filteredWomData.filter(drop => 
            drop.item_name.toLowerCase().includes(filters.itemName.toLowerCase())
          );
        }
        
        if (filters.source) {
          filteredWomData = filteredWomData.filter(drop => 
            drop.source_name.toLowerCase().includes(filters.source.toLowerCase())
          );
        }
        
        if (filters.minValue && !isNaN(filters.minValue)) {
          filteredWomData = filteredWomData.filter(drop => 
            drop.item_value >= parseInt(filters.minValue)
          );
        }
        
        if (filters.maxValue && !isNaN(filters.maxValue)) {
          filteredWomData = filteredWomData.filter(drop => 
            drop.item_value <= parseInt(filters.maxValue)
          );
        }
        
        // Apply sorting
        filteredWomData.sort((a, b) => {
          const direction = sorting.direction === 'asc' ? 1 : -1;
          
          if (sorting.field === 'timestamp') {
            return direction * (new Date(b.timestamp) - new Date(a.timestamp));
          } else if (sorting.field === 'value') {
            return direction * (a.item_value - b.item_value);
          } else if (sorting.field === 'item_name') {
            return direction * a.item_name.localeCompare(b.item_name);
          } else if (sorting.field === 'member_name') {
            return direction * a.member_name.localeCompare(b.member_name);
          }
          
          return 0;
        });
        
        // Apply pagination
        const paginatedDrops = filteredWomData.slice(offset, offset + limit);
        
        setDropsData({
          drops: paginatedDrops,
          pagination: {
            total_count: filteredWomData.length,
            offset,
            limit
          }
        });
        
        // Update data source info for WOM data
        setDataSourceInfo(prev => ({
          ...prev,
          currentSource: DataSourceTypes.WISE_OLD_MAN,
          dropsDataSource: DataSourceTypes.WISE_OLD_MAN
        }));
        
        // Clear error since we successfully fell back to WOM data
        setError(null);
      } else {
        setError('Failed to load valuable drops. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDrop = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await valuableDropsService.addValuableDrop(newDropData, wikiService);
      setShowAddForm(false);
      resetNewDropForm();
      await fetchDrops();
      await fetchDropStats();
      
      // Trigger a sync after adding a new drop
      if (performSync) {
        performSync(true);
      }
      
      // Update data source info
      setDataSourceInfo(prev => ({
        ...prev,
        currentSource: DataSourceTypes.PLUGIN,
        dropsDataSource: DataSourceTypes.PLUGIN,
        lastPluginSync: new Date()
      }));
    } catch (err) {
      setError('Failed to submit valuable drop. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDeleteModal = (drop) => {
    setSelectedDrop(drop);
    setShowDeleteModal(true);
  };

  const handleDeleteDrop = async () => {
    if (!selectedDrop) return;
    
    setLoading(true);
    setError(null);
    try {
      await valuableDropsService.removeValuableDrop(selectedDrop.drop_id);
      setShowDeleteModal(false);
      setSelectedDrop(null);
      await fetchDrops();
      await fetchDropStats();
    } catch (err) {
      setError('Failed to delete valuable drop. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    setPage(1); // Reset to first page on filter change
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDropData({
      ...newDropData,
      [name]: value
    });
  };

  const resetNewDropForm = () => {
    setNewDropData({
      member_name: '',
      item_id: '',
      item_name: '',
      item_value: '',
      item_quantity: '1',
      source_name: ''
    });
  };

  const handleSortChange = (field) => {
    const direction = sorting.field === field && sorting.direction === 'asc' ? 'desc' : 'asc';
    setSorting({ field, direction });
  };

  const renderSortIcon = (field) => {
    if (sorting.field !== field) return null;
    return sorting.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const renderPriceWithTrend = (drop) => {
    if (!drop.current_value || drop.current_value === drop.item_value) {
      return drop.formatted_value;
    }
    
    const trendIcon = drop.price_trend === 'up' 
      ? <i className="bi bi-arrow-up-circle-fill text-success"></i>
      : drop.price_trend === 'down' 
        ? <i className="bi bi-arrow-down-circle-fill text-danger"></i>
        : null;
        
    const priceDiff = Math.abs(drop.price_difference);
    const diffPercent = ((priceDiff / drop.item_value) * 100).toFixed(1);
    
    return (
      <span>
        {drop.formatted_current_value} {trendIcon}
        <small className="ms-1 text-muted">
          ({diffPercent}% {drop.price_trend === 'up' ? 'higher' : 'lower'})
        </small>
      </span>
    );
  };

  const fetchDropStats = async () => {
    try {
      const stats = await valuableDropsService.getDropStatistics();
      setDropStats(stats);
    } catch (err) {
      console.error('Failed to load drop statistics:', err);
      
      // If we have WOM data, generate basic stats from that
      if (womDropsData && womDropsData.length > 0) {
        try {
          // Generate simple statistics based on WOM data
          const totalDrops = womDropsData.length;
          const totalValue = womDropsData.reduce((sum, drop) => sum + (drop.item_value || 0) * (drop.item_quantity || 1), 0);
          const memberStats = {};
          
          // Count drops by member
          womDropsData.forEach(drop => {
            if (!memberStats[drop.member_name]) {
              memberStats[drop.member_name] = {
                count: 0,
                value: 0
              };
            }
            
            memberStats[drop.member_name].count++;
            memberStats[drop.member_name].value += (drop.item_value || 0) * (drop.item_quantity || 1);
          });
          
          const basicStats = {
            total_drops: totalDrops,
            total_value: totalValue,
            formatted_total_value: valuableDropsService.formatGp(totalValue),
            member_stats: Object.keys(memberStats).map(name => ({
              member_name: name,
              drop_count: memberStats[name].count,
              total_value: memberStats[name].value,
              formatted_value: valuableDropsService.formatGp(memberStats[name].value)
            }))
          };
          
          setDropStats(basicStats);
        } catch (statsErr) {
          console.error('Failed to generate drop statistics from WOM data:', statsErr);
        }
      }
    }
  };

  const getDataSources = () => {
    return getDataSourcesStatus(syncState, wikiState, womState);
  };

  const getSourceBadge = (dataType) => {
    switch(dataType) {
      case 'drops':
        return dataSourceInfo.dropsDataSource ? 
          DataSourceBadges[dataSourceInfo.dropsDataSource] : null;
      case 'prices':
        return dataSourceInfo.itemInfoSource ? 
          DataSourceBadges[dataSourceInfo.itemInfoSource] : null;
      default:
        return null;
    }
  };

  // Create pagination items
  const totalPages = Math.ceil(dropsData.pagination.total_count / dropsData.pagination.limit);
  let paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item 
        key={number} 
        active={number === page}
        onClick={() => setPage(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  // Render loading state
  if (loading && !dropsData.drops.length) {
    return (
      <Card className="valuable-drops-panel">
        <Card.Header className="osrs-header">
          <h4>Valuable Drops</h4>
        </Card.Header>
        <Card.Body className="text-center p-5">
          <Spinner animation="border" role="status" className="osrs-spinner">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="valuable-drops-panel">
      <Card.Header className="osrs-header d-flex justify-content-between align-items-center">
        <div>
          <h4>
            <img src="/images/icons/coins-icon.png" alt="Valuable Drops" className="feature-icon me-2" />
            Valuable Drops
          </h4>
          {syncState.lastSyncTime && (
            <small className="text-muted">
              Last updated: {new Date(syncState.lastSyncTime).toLocaleString()}
            </small>
          )}
        </div>
        <div>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="osrs-button me-2"
            onClick={() => performSync(true)}
            disabled={syncState.syncInProgress}
            title="Refresh drop data"
          >
            {syncState.syncInProgress ? (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              <i className="bi bi-arrow-clockwise"></i>
            )}
          </Button>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="osrs-button me-2"
          >
            <i className="bi bi-funnel me-1"></i>
            Filters
          </Button>
          <Button
            variant="success" 
            size="sm" 
            onClick={() => setShowAddForm(true)}
            className="osrs-button"
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Drop
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger">{error}</Alert>
        )}
        
        <Tabs defaultActiveKey="drops" className="mb-3 osrs-tabs">
          <Tab eventKey="drops" title="Drops">
            <div className="controls-section mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="osrs-button filter-toggle"
                >
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <div className="sorting-info">
                  <small>Sort: {sorting.field} ({sorting.direction})</small>
                </div>
              </div>
              
              {showFilters && (
                <Form className="filters-form mt-3">
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Player</Form.Label>
                        <Form.Select
                          name="member"
                          value={filters.member}
                          onChange={handleFilterChange}
                        >
                          <option value="">All Players</option>
                          {group?.members?.map(member => (
                            <option key={member.name} value={member.name}>{member.name}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Min Value</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Min GP"
                          name="minValue"
                          value={filters.minValue}
                          onChange={handleFilterChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Max Value</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Max GP"
                          name="maxValue"
                          value={filters.maxValue}
                          onChange={handleFilterChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Item Name</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Search items..."
                          name="itemName"
                          value={filters.itemName}
                          onChange={handleFilterChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Source</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Boss or monster name..."
                          name="source"
                          value={filters.source}
                          onChange={handleFilterChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setFilters({
                          member: '',
                          minValue: '',
                          maxValue: '',
                          itemName: '',
                          source: ''
                        });
                      }}
                      className="osrs-button me-2"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </Form>
              )}
            </div>
            
            {dropsData.drops && dropsData.drops.length > 0 ? (
              <>
                <Table striped bordered hover responsive className="drops-table">
                  <thead>
                    <tr className="table-header">
                      <th onClick={() => handleSortChange('timestamp')}>
                        Date {renderSortIcon('timestamp')}
                      </th>
                      <th onClick={() => handleSortChange('member_name')}>
                        Member {renderSortIcon('member_name')}
                      </th>
                      <th onClick={() => handleSortChange('item_name')}>
                        Item {renderSortIcon('item_name')}
                      </th>
                      <th onClick={() => handleSortChange('source_name')}>
                        Source {renderSortIcon('source_name')}
                      </th>
                      <th onClick={() => handleSortChange('value')}>
                        Value {renderSortIcon('value')}
                      </th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dropsData.drops.map(drop => (
                      <tr key={drop.drop_id} className="drop-row">
                        <td>
                          {new Date(drop.timestamp).toLocaleDateString()}
                          <div className="timestamp-time">
                            {new Date(drop.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {drop.data_source && (
                            <div className="data-source-indicator">
                              <DataSourceBadge 
                                badge={DataSourceBadges[drop.data_source]} 
                                small 
                              />
                            </div>
                          )}
                        </td>
                        <td>{drop.member_name}</td>
                        <td className="item-name-cell">
                          <div className="item-name">
                            {drop.item_name}
                            {drop.item_quantity > 1 && (
                              <span className="quantity-badge">×{drop.item_quantity}</span>
                            )}
                          </div>
                        </td>
                        <td>{drop.source_name}</td>
                        <td className="value-cell">
                          {drop.current_value && drop.current_value !== drop.item_value ? (
                            <div className="value-with-trend">
                              <div className={`current-value ${drop.price_trend}`}>
                                {drop.formatted_current_total_value}
                                <span className="trend-indicator">
                                  {drop.price_trend === 'up' ? '↑' : drop.price_trend === 'down' ? '↓' : ''}
                                </span>
                              </div>
                              <div className="original-value">
                                {drop.formatted_total_value}
                              </div>
                              {drop.price_source && (
                                <div className="data-source-indicator">
                                  <DataSourceBadge 
                                    badge={DataSourceBadges[drop.price_source || DataSourceTypes.WIKI]} 
                                    small 
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {drop.formatted_total_value || drop.formatted_value}
                              {drop.price_source && (
                                <div className="data-source-indicator">
                                  <DataSourceBadge 
                                    badge={DataSourceBadges[drop.price_source || DataSourceTypes.WIKI]} 
                                    small 
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleShowDeleteModal(drop)}
                            disabled={drop.data_source === DataSourceTypes.WISE_OLD_MAN}
                            title={drop.data_source === DataSourceTypes.WISE_OLD_MAN ? 
                              "Wise Old Man data cannot be deleted" : "Delete drop"}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <Pagination className="osrs-pagination">
                      <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                      <Pagination.Prev onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} />
                      {paginationItems}
                      <Pagination.Next onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} />
                      <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="no-drops-message">
                <p>No valuable drops found. Try adjusting your filters or add a new drop.</p>
              </div>
            )}
          </Tab>
          
          <Tab eventKey="stats" title="Statistics">
            {dropStats ? (
              <div className="drop-statistics">
                <div className="stats-overview">
                  <div className="stat-card">
                    <h5>Total Value</h5>
                    <div className="stat-value">{dropStats.formatted_total_value}</div>
                  </div>
                  <div className="stat-card">
                    <h5>Total Drops</h5>
                    <div className="stat-value">{dropStats.total_drops || 0}</div>
                  </div>
                  <div className="stat-card">
                    <h5>Average Drop Value</h5>
                    <div className="stat-value">{dropStats.formatted_average_value}</div>
                  </div>
                  <div className="stat-card">
                    <h5>Most Valuable Drop</h5>
                    <div className="stat-value">{dropStats.formatted_highest_value}</div>
                    <div className="stat-subtext">{dropStats.highest_value_item || 'N/A'}</div>
                  </div>
                </div>
                
                <h5 className="mt-4 mb-3">Player Statistics</h5>
                {dropStats.member_stats && dropStats.member_stats.length > 0 ? (
                  <Table striped bordered className="member-stats-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Total Drops</th>
                        <th>Total Value</th>
                        <th>Average Value</th>
                        <th>Most Valuable Drop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dropStats.member_stats.map((member) => (
                        <tr key={member.member_name}>
                          <td>{member.member_name}</td>
                          <td>{member.drop_count || 0}</td>
                          <td>{member.formatted_total_value}</td>
                          <td>{member.formatted_average_value}</td>
                          <td>
                            {member.best_drop ? (
                              <>
                                <div>{member.best_drop.item_name}</div>
                                <Badge bg="secondary">{member.formatted_highest_value}</Badge>
                              </>
                            ) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <p>No player statistics available.</p>
                )}
              </div>
            ) : (
              <div className="text-center p-5">
                <Spinner animation="border" role="status" className="osrs-spinner">
                  <span className="visually-hidden">Loading statistics...</span>
                </Spinner>
              </div>
            )}
          </Tab>
        </Tabs>
        
        <DataSourcesPanel 
          dataSources={getDataSources()}
          currentSource={dataSourceInfo.currentSource}
          sourceBadge={getSourceBadge('drops')}
        />
        
        {/* Add Valuable Drop Modal */}
        <Modal
          show={showAddForm}
          onHide={() => {
            setShowAddForm(false);
            resetNewDropForm();
          }}
          centered
          className="osrs-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Add Valuable Drop</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleSubmitDrop}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Player</Form.Label>
                    <Form.Select
                      name="member_name"
                      value={newDropData.member_name}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Player</option>
                      {group?.members?.map(member => (
                        <option key={member.name} value={member.name}>{member.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Item ID</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="OSRS Item ID"
                      name="item_id"
                      value={newDropData.item_id}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Item Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Item name"
                      name="item_name"
                      value={newDropData.item_name}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Value (GP)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Item value in GP"
                      name="item_value"
                      value={newDropData.item_value}
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
                      placeholder="Quantity"
                      name="item_quantity"
                      value={newDropData.item_quantity}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Source</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Boss or monster name"
                      name="source_name"
                      value={newDropData.source_name}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    resetNewDropForm();
                  }}
                  className="osrs-button me-2"
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  type="submit"
                  className="osrs-button"
                >
                  Add Drop
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
        
        {/* Delete Confirmation Modal */}
        <Modal
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setSelectedDrop(null);
          }}
          centered
          className="osrs-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedDrop && (
              <p>
                Are you sure you want to delete the {selectedDrop.item_name} drop ({selectedDrop.formatted_value}) by {selectedDrop.member_name}?
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedDrop(null);
              }}
              className="osrs-button"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteDrop}
              className="osrs-button"
            >
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default ValuableDropsPanel;
