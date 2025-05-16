import React, { createContext, useState, useEffect, useContext } from 'react';
import { groupData } from '../data/group-data';
import dataSyncService from '../features/data-sync/data-sync-service';
import { addGroupDataListener } from '../utils/event-utils';
import addSafeEventListener from '../utils/addEventListener';

// Status constants
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Create context with default value
export const SyncContext = createContext({
  syncData: () => {},
  syncStatus: SYNC_STATUS.IDLE,
  lastSynced: null,
  wikiService: null,
  wikiState: { status: SYNC_STATUS.IDLE, lastUpdated: null },
  pluginData: null,
  dataSyncService: null
});

// Provider component for data synchronization
// Manages state for various data sources (plugin, wiki, etc.)
export const SyncContextProvider = ({ children, wikiService }) => {
  const [syncStatus, setSyncStatus] = useState(SYNC_STATUS.IDLE);
  const [lastSynced, setLastSynced] = useState(null);
  const [pluginData, setPluginData] = useState(null);
  const [wikiState, setWikiState] = useState({
    status: SYNC_STATUS.IDLE,
    lastUpdated: null
  });
  
  // Initialize data synchronization service
  useEffect(() => {
    console.log('SyncContext: Ensuring dataSyncService is initialized');
    try {
      dataSyncService.initialize();
      console.log('SyncContext: dataSyncService initialized successfully');
    } catch (err) {
      console.error('SyncContext: Error initializing dataSyncService', err);
    }

    // Use our robust event handler for group data updates
    const handleGroupDataUpdate = (data) => {
      console.log('SyncContext: Received group-data-updated event', data);
      setPluginData(data);
      setLastSynced(new Date());
      setSyncStatus(SYNC_STATUS.SUCCESS);
    };

    // Add the listener with our new utility
    const cleanup = addGroupDataListener(handleGroupDataUpdate);

    return cleanup; // Our utility returns a proper cleanup function
  }, [wikiService]);

  // Track plugin data availability
  useEffect(() => {
    if (groupData && groupData.members) {
      setPluginData(groupData);
      setLastSynced(new Date());
    }
  }, [groupData]);

  // Initialize Wiki service if available
  useEffect(() => {
    if (wikiService && typeof wikiService.initialize === 'function') {
      const result = wikiService.initialize();
      if (result && typeof result.then === 'function') {
        result.then(() => {
          setWikiState({
            status: SYNC_STATUS.SUCCESS,
            lastUpdated: new Date()
          });
        }).catch(error => {
          console.error('Failed to initialize Wiki service:', error);
          setWikiState({
            status: SYNC_STATUS.ERROR,
            lastUpdated: null,
            error
          });
        });
      } else {
        setWikiState({
          status: SYNC_STATUS.SUCCESS,
          lastUpdated: new Date()
        });
      }
    }
  }, [wikiService]);

  /**
   * Manually trigger data synchronization
   */
  const syncData = async () => {
    try {
      setSyncStatus(SYNC_STATUS.SYNCING);
      
      // Trigger plugin data sync
      if (dataSyncService) {
        // Check which sync methods are available
        if (groupData && groupData.members && typeof dataSyncService.syncGroupData === 'function') {
          // Get all member names from group data
          const memberNames = groupData.members.map(member => member.name || member.displayName);
          await dataSyncService.syncGroupData(memberNames, true);
          console.log('SyncContext: Group data synced successfully');
        } else if (typeof dataSyncService.syncPlayerData === 'function' && groupData && groupData.members && groupData.members[0]) {
          // Fallback to syncing just the active player
          const activeMember = groupData.members[0].name || groupData.members[0].displayName;
          await dataSyncService.syncPlayerData(activeMember, true);
          console.log('SyncContext: Active player data synced successfully');
        } else {
          console.warn('SyncContext: Unable to sync data - required methods not available', dataSyncService);
        }
      }
      
      // Refresh Wiki data if service is available
      if (wikiService) {
        setWikiState({
          ...wikiState,
          status: SYNC_STATUS.SYNCING
        });
        
        await wikiService.refreshData();
        
        setWikiState({
          status: SYNC_STATUS.SUCCESS,
          lastUpdated: new Date()
        });
      }
      
      setLastSynced(new Date());
      setSyncStatus(SYNC_STATUS.SUCCESS);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(SYNC_STATUS.ERROR);
      
      if (wikiService) {
        setWikiState({
          ...wikiState,
          status: SYNC_STATUS.ERROR,
          error
        });
      }
    }
  };

  return (
    <SyncContext.Provider
      value={{
        syncData,
        syncStatus,
        lastSynced,
        wikiService,
        wikiState,
        pluginData,
        dataSyncService
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

// Custom hook to use the sync context
// @returns {Object} The sync context
export const useSync = () => {
  return useContext(SyncContext);
};
