import React, { useState, useEffect } from 'react';
import { useGroupData } from '../../hooks/group-data-hook';
import ValuableDropsService from './valuable-drops-service';
import './valuable-drops.css';

/**
 * Component that displays valuable drops from group members
 */
export default function ValuableDrops() {
  // State for valuable drops data
  const [valuableDrops, setValuableDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 25,
    totalCount: 0,
    hasMore: false
  });
  
  // State for filters
  const [filters, setFilters] = useState({
    memberName: '',
    minValue: '',
    sourceName: '',
    itemName: '',
    sort: 'timestamp',
    direction: 'desc'
  });
  
  // Get group data from context
  const { groupData } = useGroupData();
  const memberNames = groupData?.members?.map(member => member.name) || [];
  
  // Load valuable drops on component mount and when filters change
  useEffect(() => {
    loadValuableDrops();
  }, [filters.sort, filters.direction]);
  
  /**
   * Load valuable drops from the API
   * @param {boolean} append - Whether to append to existing drops or replace them
   */
  const loadValuableDrops = async (append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filter parameters
      const filterParams = {
        ...filters,
        offset: append ? pagination.offset + pagination.limit : 0
      };
      
      // Only include filters with values
      Object.keys(filterParams).forEach(key => {
        if (!filterParams[key]) delete filterParams[key];
      });
      
      // Call the service to get drops
      const response = await ValuableDropsService.getValuableDrops(filterParams);
      
      // Update state with new data
      if (append) {
        setValuableDrops(prev => [...prev, ...response.drops]);
      } else {
        setValuableDrops(response.drops);
      }
      
      // Update pagination
      setPagination(response.pagination);
      
    } catch (err) {
      console.error('Failed to load valuable drops:', err);
      setError('Failed to load valuable drops. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handle filter changes
   * @param {Event} e - Input change event
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  /**
   * Apply filters
   */
  const applyFilters = (e) => {
    e.preventDefault();
    loadValuableDrops();
  };
  
  /**
   * Reset filters
   */
  const resetFilters = () => {
    setFilters({
      memberName: '',
      minValue: '',
      sourceName: '',
      itemName: '',
      sort: 'timestamp',
      direction: 'desc'
    });
    loadValuableDrops();
  };
  
  /**
   * Change sort column
   * @param {string} column - Column to sort by
   */
  const changeSort = (column) => {
    setFilters(prev => {
      // If already sorting by this column, toggle direction
      if (prev.sort === column) {
        return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // Otherwise sort by the new column in descending order
      return { ...prev, sort: column, direction: 'desc' };
    });
  };
  
  /**
   * Get sort indicator for table header
   * @param {string} column - Column name
   * @returns {string} - Sort indicator symbol
   */
  const getSortIndicator = (column) => {
    if (filters.sort === column) {
      return filters.direction === 'asc' ? '↑' : '↓';
    }
    return '';
  };
  
  /**
   * Format value with color coding based on value
   * @param {number} value - GP value
   * @returns {JSX.Element} - Formatted value with color
   */
  const formatValue = (value) => {
    let colorClass = '';
    
    if (value >= 10000000) { // 10M+
      colorClass = 'value-legendary';
    } else if (value >= 1000000) { // 1M+
      colorClass = 'value-epic';
    } else if (value >= 100000) { // 100K+
      colorClass = 'value-rare';
    } else if (value >= 10000) { // 10K+
      colorClass = 'value-uncommon';
    }
    
    return <span className={colorClass}>{formatGp(value)}</span>;
  };
  
  /**
   * Format GP value with K, M, B suffixes
   * @param {number} value - GP value
   * @returns {string} - Formatted GP string
   */
  const formatGp = (value) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };
  
  /**
   * Format timestamp to a readable date/time
   * @param {string} timestamp - ISO timestamp
   * @returns {string} - Formatted date and time
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  /**
   * Handle loading more drops
   */
  const loadMore = () => {
    loadValuableDrops(true);
  };

  return (
    <div className="valuable-drops-container">
      <h1 className="feature-title">Valuable Drops</h1>
      
      {/* Filter form */}
      <div className="filter-section">
        <form onSubmit={applyFilters} className="filters-form">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="memberName">Member:</label>
              <select
                id="memberName"
                name="memberName"
                value={filters.memberName}
                onChange={handleFilterChange}
              >
                <option value="">All Members</option>
                {memberNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="minValue">Min Value:</label>
              <input
                id="minValue"
                name="minValue"
                type="number"
                placeholder="Minimum GP"
                value={filters.minValue}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="sourceName">Source:</label>
              <input
                id="sourceName"
                name="sourceName"
                type="text"
                placeholder="Source name"
                value={filters.sourceName}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="itemName">Item:</label>
              <input
                id="itemName"
                name="itemName"
                type="text"
                placeholder="Item name"
                value={filters.itemName}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          
          <div className="filter-actions">
            <button type="submit" className="button-primary">Apply Filters</button>
            <button type="button" className="button-secondary" onClick={resetFilters}>Reset</button>
          </div>
        </form>
      </div>
      
      {/* Error message */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Drops table */}
      <div className="table-container">
        <table className="valuable-drops-table">
          <thead>
            <tr>
              <th onClick={() => changeSort('member_name')}>
                Player {getSortIndicator('member_name')}
              </th>
              <th onClick={() => changeSort('item_name')}>
                Item {getSortIndicator('item_name')}
              </th>
              <th onClick={() => changeSort('item_quantity')}>
                Quantity {getSortIndicator('item_quantity')}
              </th>
              <th onClick={() => changeSort('item_value')}>
                Value {getSortIndicator('item_value')}
              </th>
              <th onClick={() => changeSort('source_name')}>
                Source {getSortIndicator('source_name')}
              </th>
              <th onClick={() => changeSort('timestamp')}>
                Time {getSortIndicator('timestamp')}
              </th>
            </tr>
          </thead>
          <tbody>
            {valuableDrops.length === 0 && !loading ? (
              <tr>
                <td colSpan="6" className="no-data-message">
                  No valuable drops found.
                </td>
              </tr>
            ) : (
              valuableDrops.map(drop => (
                <tr key={drop.drop_id}>
                  <td>{drop.member_name}</td>
                  <td>
                    <div className="item-cell">
                      <img
                        src={`https://oldschool.runescape.wiki/images/Item_ID_${drop.item_id}.png`}
                        alt={drop.item_name}
                        className="item-icon"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/placeholder_item.png';
                        }}
                      />
                      <span className="item-name">{drop.item_name}</span>
                    </div>
                  </td>
                  <td>{drop.item_quantity > 1 ? drop.item_quantity : ''}</td>
                  <td>{formatValue(drop.item_value)}</td>
                  <td>{drop.source_name}</td>
                  <td>{formatTimestamp(drop.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Loading indicator */}
      {loading && <div className="loading-spinner">Loading...</div>}
      
      {/* Load more button */}
      {pagination.hasMore && !loading && (
        <div className="load-more-container">
          <button className="button-primary" onClick={loadMore}>
            Load More ({pagination.offset + valuableDrops.length} of {pagination.totalCount})
          </button>
        </div>
      )}
      
      {/* Drop submission form - could be expanded in the future */}
      <div className="add-drop-section">
        <h2>Add New Drop</h2>
        <p>Coming soon: Form to manually add valuable drops.</p>
        <p>Currently drops are automatically tracked when received in-game via the plugin.</p>
      </div>
    </div>
  );
}
