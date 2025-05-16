import React, { createContext, useState, useEffect, useContext } from 'react';

/**
 * WikiContext
 * Provides OSRS Wiki integration services to all components
 * Acts as the tertiary data source for enriching player and item data
 */

const WikiContext = createContext();

export const WikiProvider = ({ children }) => {
  const [wikiData, setWikiData] = useState({});
  const [lastFetched, setLastFetched] = useState({});
  const cacheDuration = 60 * 60 * 1000; // 60 minutes in milliseconds

  const fetchWikiData = async (itemId) => {
    if (!itemId) return null;
    
    // Check if we have cached data that's still fresh
    if (wikiData[itemId] && 
        lastFetched[itemId] && 
        Date.now() - lastFetched[itemId] < cacheDuration) {
      return wikiData[itemId];
    }
    
    try {
      // In a real implementation, this would fetch from the OSRS Wiki API
      console.log(`Fetching wiki data for item: ${itemId}`);
      
      // Simulate API response for now
      const data = { itemId, name: `Item ${itemId}`, source: 'wiki' };
      
      // Update cache
      setWikiData(prev => ({...prev, [itemId]: data}));
      setLastFetched(prev => ({...prev, [itemId]: Date.now()}));
      
      return data;
    } catch (error) {
      console.error('Error fetching wiki data:', error);
      return null;
    }
  };

  const clearCache = () => {
    setWikiData({});
    setLastFetched({});
  };

  const forceRefresh = async (itemId) => {
    // Remove the item from last fetched to force a refresh
    if (itemId) {
      setLastFetched(prev => {
        const newState = {...prev};
        delete newState[itemId];
        return newState;
      });
      return fetchWikiData(itemId);
    }
    return null;
  };

  const value = {
    wikiData,
    fetchWikiData,
    clearCache,
    forceRefresh,
    lastFetched
  };

  return (
    <WikiContext.Provider value={value}>
      {children}
    </WikiContext.Provider>
  );
};

export const useWiki = () => {
  const context = useContext(WikiContext);
  if (context === undefined) {
    throw new Error('useWiki must be used within a WikiProvider');
  }
  return context;
};

export default WikiContext;
