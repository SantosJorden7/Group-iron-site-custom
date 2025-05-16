import React, { createContext, useState, useEffect, useContext } from 'react';
import { groupData } from '../data/group-data';
import { storage } from '../data/storage';
import { addGroupDataListener } from '../utils/event-utils';

// Create context with default values
export const GroupContext = createContext({
  group: null,
  groupMembers: [],
  activeMember: null,
  setActiveMember: () => {},
  loading: true,
  error: null
});

/**
 * Custom hook to use the group context
 * @returns {Object} Group context value
 */
export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupContextProvider');
  }
  return context;
};

/**
 * Provider component for group data context
 * Interfaces with the Group Ironmen site's native data system
 */
export const GroupContextProvider = ({ children }) => {
  const [group, setGroup] = useState(storage.getGroup());
  const [groupMembers, setGroupMembers] = useState([]);
  const [activeMember, setActiveMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to group data updates
  useEffect(() => {
    const updateGroupData = () => {
      try {
        const currentGroup = storage.getGroup();
        setGroup(currentGroup);
        setGroupMembers(currentGroup?.members || []);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    // Use our robust event handler for group data updates
    const cleanup = addGroupDataListener(updateGroupData);
    
    // Initial data load
    updateGroupData();

    return cleanup; // Our utility returns a proper cleanup function
  }, []);

  return (
    <GroupContext.Provider 
      value={{
        group,
        groupMembers,
        activeMember,
        setActiveMember,
        loading,
        error
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};
