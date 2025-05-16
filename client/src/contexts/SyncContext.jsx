import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import dataSyncService from '../features/data-sync/data-sync-service';
import wikiService from '../features/wiki-integration/wiki-service';
import wiseOldManService from '../features/data-sync/wise-old-man-service';
import collectionLogService from '../features/collection-log/collection-log-service';
import { useAuth } from './AuthContext';
import { useGroup } from './GroupContext';
import { store } from '../store/store';
import { addNotification } from '../store/actions/notificationActions';

// Create context
const SyncContext = createContext();

/**
 * Provider component for data synchronization and wiki service integration
 */
export const SyncProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { group } = useGroup();
  const backgroundSyncRef = useRef(null);
  const lastManualSyncRef = useRef(null);
  
  // Sync state
  const [syncState, setSyncState] = useState({
    lastSyncTime: null,
    syncInProgress: false,
    syncError: null,
    autoSyncEnabled: true,
    syncInterval: 30, // minutes
    valuableDropThreshold: 50000,
    isTabVisible: true,
    isOnline: navigator.onLine,
    manualSyncTriggered: false
  });
  
  // Wiki state
  const [wikiState, setWikiState] = useState({
    wikiCacheEnabled: true,
    preferLiveData: true,
    lastWikiAccess: null,
    wikiError: null
  });

  // Wise Old Man state
  const [womState, setWomState] = useState({
    womCacheEnabled: true,
    preferPluginData: true, // prefer plugin data over WOM data when available
    lastWomAccess: null,
    womError: null
  });

  // Collection Log state
  const [collectionLogState, setCollectionLogState] = useState({
    collectionLogInitialized: false,
    lastCollectionLogSync: null,
    collectionLogError: null
  });

  // Track tab visibility and online status
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setSyncState(prev => ({ ...prev, isTabVisible: isVisible }));
      
      // If tab becomes visible and it's been over 30 minutes since last sync, trigger a sync
      if (isVisible && syncState.lastSyncTime) {
        const lastSyncTime = new Date(syncState.lastSyncTime).getTime();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        
        if (lastSyncTime < thirtyMinutesAgo && syncState.autoSyncEnabled) {
          performSync(false); // quiet background sync
        }
      }
    };
    
    const handleOnlineStatus = () => {
      setSyncState(prev => ({ ...prev, isOnline: navigator.onLine }));
      
      // If we're back online, trigger a sync if needed
      if (navigator.onLine && syncState.autoSyncEnabled && syncState.lastSyncTime) {
        const lastSyncTime = new Date(syncState.lastSyncTime).getTime();
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        
        if (lastSyncTime < thirtyMinutesAgo) {
          performSync(false); // quiet background sync
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [syncState.lastSyncTime, syncState.autoSyncEnabled]);

  // Initialize sync service with settings
  useEffect(() => {
    // Load user preferences from local storage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    if (savedSettings.sync) {
      setSyncState(prev => ({ ...prev, ...savedSettings.sync }));
      
      // Apply valuable drop threshold
      if (savedSettings.sync.valuableDropThreshold) {
        dataSyncService.setValuableDropThreshold(savedSettings.sync.valuableDropThreshold);
      }
    }
    
    if (savedSettings.wiki) {
      setWikiState(prev => ({ ...prev, ...savedSettings.wiki }));
    }

    if (savedSettings.wom) {
      setWomState(prev => ({ ...prev, ...savedSettings.wom }));
    }
    
    if (savedSettings.collectionLog) {
      setCollectionLogState(prev => ({ ...prev, ...savedSettings.collectionLog }));
    }
  }, []);

  // Initialize services
  useEffect(() => {
    // Initialize the WikiService
    if (!wikiState.wikiCacheEnabled) {
      wikiService.initialize();
    }
    
    // Initialize WiseOldManService
    if (!womState.womCacheEnabled && group?.name) {
      wiseOldManService.initialize(group.name);
    }
    
    // Initialize Collection Log Service
    if (wikiState.wikiCacheEnabled && womState.womCacheEnabled && !collectionLogState.collectionLogInitialized) {
      collectionLogService.initialize(wikiService, wiseOldManService);
      setCollectionLogState(prev => ({ ...prev, collectionLogInitialized: true }));
    }
  }, [group, wikiState.wikiCacheEnabled, womState.womCacheEnabled, collectionLogState.collectionLogInitialized]);

  // Manage the background sync process
  useEffect(() => {
    const setupBackgroundSync = () => {
      // Clear any existing interval
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
        backgroundSyncRef.current = null;
      }
      
      // Only set up background sync if enabled, user is logged in, and group exists
      if (syncState.autoSyncEnabled && currentUser && group && group.members?.length > 0) {
        backgroundSyncRef.current = setInterval(() => {
          // Skip if a sync is in progress, tab is hidden, or user is offline
          if (syncState.syncInProgress || !syncState.isTabVisible || !syncState.isOnline) {
            return;
          }
          
          // Skip if manual sync was performed recently (within last 15 minutes)
          if (lastManualSyncRef.current) {
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            if (lastManualSyncRef.current > fifteenMinutesAgo) {
              return;
            }
          }
          
          // Perform quiet background sync
          performSync(false);
        }, syncState.syncInterval * 60 * 1000);
      }
    };
    
    // Initialize background sync
    setupBackgroundSync();
    
    // Clean up on unmount
    return () => {
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
      }
    };
  }, [currentUser, group, syncState.autoSyncEnabled, syncState.syncInterval, syncState.isTabVisible, syncState.isOnline]);

  /**
   * Perform data synchronization
   * @param {boolean} showNotifications - Whether to show notifications for sync results
   * @param {boolean} isManual - Whether this was manually triggered by the user
   */
  const performSync = async (showNotifications = true, isManual = false) => {
    if (syncState.syncInProgress) {
      return;
    }
    
    // Track manual syncs for throttling background syncs
    if (isManual) {
      lastManualSyncRef.current = Date.now();
    }
    
    setSyncState(prev => ({ ...prev, syncInProgress: true, syncError: null }));
    
    try {
      if (!group || !group.members || group.members.length === 0) {
        throw new Error('No group members to sync');
      }
      
      const memberNames = group.members.map(member => member.name || member.username);
      
      // Perform group sync
      const syncResult = await dataSyncService.syncGroupData(memberNames);
      
      // Update Wise Old Man data if enabled
      if (womState.womCacheEnabled) {
        try {
          await updateWiseOldManData(group.name, memberNames);
        } catch (womError) {
          console.error('Wise Old Man sync failed:', womError);
          setWomState(prev => ({ ...prev, womError: womError.message }));
          // Continue with other syncs; this is non-critical
        }
      }
      
      // Sync Collection Log data if enabled
      if (collectionLogState.collectionLogInitialized) {
        try {
          await syncCollectionLog();
        } catch (collectionLogError) {
          console.error('Collection Log sync failed:', collectionLogError);
          setCollectionLogState(prev => ({ ...prev, collectionLogError: collectionLogError.message }));
          // Continue with other syncs; this is non-critical
        }
      }
      
      setSyncState(prev => ({ 
        ...prev, 
        lastSyncTime: new Date(),
        syncInProgress: false
      }));
      
      if (showNotifications) {
        store.dispatch(
          addNotification({
            id: `sync-success-${Date.now()}`,
            type: 'success',
            title: 'Sync Complete',
            message: `Successfully synced data for ${syncResult.members.length} group members.`,
            autoDismiss: true
          })
        );
      }
      
      return syncResult;
    } catch (error) {
      console.error('Sync failed:', error);
      
      setSyncState(prev => ({ 
        ...prev, 
        syncInProgress: false,
        syncError: error.message
      }));
      
      if (showNotifications) {
        store.dispatch(
          addNotification({
            id: `sync-error-${Date.now()}`,
            type: 'danger',
            title: 'Sync Failed',
            message: `Could not sync group data: ${error.message}`,
            autoDismiss: true
          })
        );
      }
      
      return null;
    }
  };

  /**
   * Update Wise Old Man data for the group
   * @param {string} groupName - Name of the group
   * @param {Array<string>} memberNames - Names of group members
   */
  const updateWiseOldManData = async (groupName, memberNames) => {
    try {
      // First, make sure all players are tracked in WOM
      const updatePromises = memberNames.map(name => wiseOldManService.updatePlayer(name));
      await Promise.all(updatePromises);
      
      // Then get or create the group in WOM
      await wiseOldManService.getOrCreateGroup(groupName, memberNames);
      
      setWomState(prev => ({ 
        ...prev, 
        lastWomAccess: new Date(),
        womError: null 
      }));
    } catch (error) {
      console.error('Wise Old Man update failed:', error);
      throw error;
    }
  };

  /**
   * Sync Collection Log data
   */
  const syncCollectionLog = useCallback(async () => {
    if (syncState.syncInProgress) return;
    
    try {
      setSyncState(prev => ({ ...prev, syncInProgress: true }));
      
      // Trigger a general sync to refresh plugin data
      await performSync(false);
      
      // Perform collection log specific sync operations
      const collectionLogEvent = new CustomEvent('collection-log-refresh');
      window.dispatchEvent(collectionLogEvent);
      
      // Refresh WiseOldMan data for players in the group
      if (group?.members && wiseOldManService) {
        const syncPromises = group.members.map(member => 
          wiseOldManService.getPlayerAchievements(member.name)
        );
        await Promise.allSettled(syncPromises);
      }
      
      setSyncState(prev => ({ 
        ...prev, 
        syncInProgress: false,
        lastSynced: new Date(),
        lastSyncError: null,
        manualSyncTriggered: true
      }));
      
      // Reset the manual trigger flag after 10 seconds
      setTimeout(() => {
        setSyncState(prev => ({ ...prev, manualSyncTriggered: false }));
      }, 10000);
      
      return true;
    } catch (error) {
      console.error('Collection Log sync error:', error);
      setSyncState(prev => ({ 
        ...prev, 
        syncInProgress: false,
        lastSyncError: error.message
      }));
      return false;
    }
  }, [syncState.syncInProgress, performSync, group]);

  /**
   * Get merged player data from both plugin and Wise Old Man
   * @param {string} username - Player username
   * @returns {Promise<Object>} - Merged player data
   */
  const getMergedPlayerData = async (username) => {
    try {
      // Get plugin data first (priority)
      const pluginData = await dataSyncService.getPlayerData(username);
      
      // Get Wise Old Man data for enrichment
      const womData = await wiseOldManService.getPlayer(username);
      
      if (!pluginData && !womData) {
        throw new Error(`No data available for player: ${username}`);
      }
      
      // If only one source is available, use that
      if (!pluginData) return { ...womData, dataSource: 'wom' };
      if (!womData) return { ...pluginData, dataSource: 'plugin' };
      
      // Merge data, prioritizing plugin data for overlapping fields
      const mergedData = {
        ...womData,
        ...pluginData,
        // Keep both sources for comparison
        pluginData,
        womData,
        dataSource: 'merged',
        lastSyncTime: pluginData.lastSyncTime || womData.updatedAt
      };
      
      return mergedData;
    } catch (error) {
      console.error(`Error merging player data for ${username}:`, error);
      throw error;
    }
  };

  /**
   * Update sync settings
   * @param {Object} settings - New sync settings
   */
  const updateSyncSettings = (settings) => {
    const newState = { ...syncState, ...settings };
    setSyncState(newState);
    
    // Save to local storage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    savedSettings.sync = newState;
    localStorage.setItem('userSettings', JSON.stringify(savedSettings));
    
    // Update valuable drop threshold if changed
    if (settings.valuableDropThreshold && settings.valuableDropThreshold !== syncState.valuableDropThreshold) {
      dataSyncService.setValuableDropThreshold(settings.valuableDropThreshold);
    }
  };

  /**
   * Update wiki settings
   * @param {Object} settings - New wiki settings
   */
  const updateWikiSettings = (settings) => {
    const newState = { ...wikiState, ...settings };
    setWikiState(newState);
    
    // Save to local storage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    savedSettings.wiki = newState;
    localStorage.setItem('userSettings', JSON.stringify(savedSettings));
  };

  /**
   * Update Wise Old Man settings
   * @param {Object} settings - New WOM settings
   */
  const updateWomSettings = (settings) => {
    const newState = { ...womState, ...settings };
    setWomState(newState);
    
    // Save to local storage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    savedSettings.wom = newState;
    localStorage.setItem('userSettings', JSON.stringify(savedSettings));
  };

  /**
   * Update Collection Log settings
   * @param {Object} settings - New Collection Log settings
   */
  const updateCollectionLogSettings = (settings) => {
    const newState = { ...collectionLogState, ...settings };
    setCollectionLogState(newState);
    
    // Save to local storage
    const savedSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    savedSettings.collectionLog = newState;
    localStorage.setItem('userSettings', JSON.stringify(savedSettings));
  };

  /**
   * Fetch wiki data with proper error handling and state tracking
   * @param {Function} fetchFunction - The wiki service function to call
   * @param {Array} args - Arguments to pass to the function
   * @returns {Promise<any>} - The result of the wiki function call
   */
  const fetchWikiData = async (fetchFunction, ...args) => {
    try {
      setWikiState(prev => ({ ...prev, wikiError: null }));
      const result = await fetchFunction(...args);
      setWikiState(prev => ({ ...prev, lastWikiAccess: new Date() }));
      return result;
    } catch (error) {
      console.error('Wiki data fetch error:', error);
      setWikiState(prev => ({ ...prev, wikiError: error.message }));
      throw error;
    }
  };

  /**
   * Fetch Wise Old Man data with proper error handling and state tracking
   * @param {Function} fetchFunction - The WOM service function to call
   * @param {Array} args - Arguments to pass to the function
   * @returns {Promise<any>} - The result of the function call
   */
  const fetchWomData = async (fetchFunction, ...args) => {
    try {
      setWomState(prev => ({ ...prev, womError: null }));
      const result = await fetchFunction(...args);
      setWomState(prev => ({ ...prev, lastWomAccess: new Date() }));
      return result;
    } catch (error) {
      console.error('Wise Old Man data fetch error:', error);
      setWomState(prev => ({ ...prev, womError: error.message }));
      throw error;
    }
  };

  const contextValue = {
    // Sync state and methods
    syncState,
    performSync,
    syncCollectionLog,
    updateSyncSettings,
    getMergedPlayerData,
    
    // Wiki state and methods
    wikiState,
    updateWikiSettings,
    
    // Wise Old Man state and methods
    womState,
    updateWomSettings,
    
    // Collection Log state and methods
    collectionLogState,
    updateCollectionLogSettings,
    
    // Enhanced wiki service with state tracking
    wikiService: {
      search: (...args) => fetchWikiData(wikiService.search.bind(wikiService), ...args),
      getPage: (...args) => fetchWikiData(wikiService.getPage.bind(wikiService), ...args),
      getItem: (...args) => fetchWikiData(wikiService.getItemInfo.bind(wikiService), ...args),
      getMonster: (...args) => fetchWikiData(wikiService.getMonster.bind(wikiService), ...args),
      clearCache: () => wikiService.clearCache()
    },
    
    // Enhanced Wise Old Man service with state tracking
    wiseOldManService: {
      getPlayer: (...args) => fetchWomData(wiseOldManService.getPlayer.bind(wiseOldManService), ...args),
      getPlayerSkills: (...args) => fetchWomData(wiseOldManService.getPlayerSkills.bind(wiseOldManService), ...args),
      getPlayerBossKCs: (...args) => fetchWomData(wiseOldManService.getPlayerBossKCs.bind(wiseOldManService), ...args),
      getPlayerAchievements: (...args) => fetchWomData(wiseOldManService.getPlayerAchievements.bind(wiseOldManService), ...args),
      getGroupDetails: (...args) => fetchWomData(wiseOldManService.getGroupDetails.bind(wiseOldManService), ...args),
      getGroupHiscores: (...args) => fetchWomData(wiseOldManService.getGroupHiscores.bind(wiseOldManService), ...args),
      updatePlayer: (...args) => fetchWomData(wiseOldManService.updatePlayer.bind(wiseOldManService), ...args),
      clearCache: () => wiseOldManService.clearCache()
    },
    
    // Enhanced Collection Log service with state tracking
    collectionLogService: {
      refresh: () => collectionLogService.refresh(),
      clearCache: () => collectionLogService.clearCache()
    },
    
    // Direct service access (for advanced usage)
    dataSyncService,
    wikiService,
    wiseOldManService,
    collectionLogService
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

/**
 * Hook for using the sync context
 */
export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

export default SyncContext;
