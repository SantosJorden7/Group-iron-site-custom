import { useState, useEffect } from 'react';
import valuableDropsData from './valuable-drops-data';
import { EventBus } from '../../services/event-bus';

/**
 * Custom hook for accessing valuable drops data in React components
 * @param {Object} initialFilters - Optional initial filters
 * @returns {Object} Valuable drops state and actions
 */
export function useValuableDrops(initialFilters = {}) {
  const [drops, setDrops] = useState([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    offset: 0,
    limit: 25,
    hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  
  // Load drops with the current filters
  const loadDrops = async (append = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update data manager with current filters
      valuableDropsData.updateFilters(filters);
      
      // Load drops
      const result = await valuableDropsData.loadDrops(append);
      
      // Update state
      setDrops(append ? [...drops, ...result] : result);
      setPagination(valuableDropsData.pagination);
    } catch (err) {
      setError('Failed to load valuable drops data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new valuable drop
  const addDrop = async (dropData) => {
    setLoading(true);
    setError(null);
    
    try {
      await valuableDropsData.addDrop(dropData);
      await loadDrops();
    } catch (err) {
      setError('Failed to add valuable drop');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete a valuable drop
  const deleteDrop = async (dropId) => {
    setLoading(true);
    setError(null);
    
    try {
      await valuableDropsData.deleteDrop(dropId);
      await loadDrops();
    } catch (err) {
      setError('Failed to delete valuable drop');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };
  
  // Reset filters
  const resetFilters = () => {
    valuableDropsData.resetFilters();
    setFilters({});
  };
  
  // Subscribe to valuable drops events
  useEffect(() => {
    const dropsLoadedHandler = (loadedDrops) => {
      setDrops(loadedDrops);
      setPagination(valuableDropsData.pagination);
    };
    
    const dropsErrorHandler = (errorMsg) => {
      setError(errorMsg);
    };
    
    // Subscribe to events
    EventBus.subscribe('valuable-drops-loaded', dropsLoadedHandler);
    EventBus.subscribe('valuable-drops-error', dropsErrorHandler);
    
    // Cleanup subscriptions
    return () => {
      EventBus.unsubscribe('valuable-drops-loaded', dropsLoadedHandler);
      EventBus.unsubscribe('valuable-drops-error', dropsErrorHandler);
    };
  }, []);
  
  return {
    drops,
    pagination,
    loading,
    error,
    filters,
    loadDrops,
    addDrop,
    deleteDrop,
    updateFilters,
    resetFilters
  };
}
