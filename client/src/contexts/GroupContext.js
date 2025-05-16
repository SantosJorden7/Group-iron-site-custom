/**
 * Group Context
 * 
 * Provides global state management for group-related data throughout the application.
 * This includes group information, active member selection, and related functionality.
 */
import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Create the context with default values
const GroupContext = createContext({
  // State
  group: null,
  activeMember: null,
  loading: true,
  error: null,
  
  // Actions
  setActiveMember: () => {},
  refreshGroupData: async () => {},
  updateMember: () => {},
  addMember: () => {},
  removeMember: () => {},
  
  // API methods (will be bound to the group ID)
  getActivities: () => {},
  createActivity: () => {},
  getBossStrategies: () => {},
  createBossStrategy: () => {},
  getChallenges: () => {},
  createChallenge: () => {},
  getMilestones: () => {},
  createMilestone: () => {},
  getEvents: () => {},
  createEvent: () => {},
  getSlayerTasks: () => {},
  createSlayerTask: () => {},
  getValuableDrops: () => {},
  addValuableDrop: () => {},
});

export const GroupProvider = ({ children }) => {
  const [group, setGroup] = useState(null);
  const [activeMember, setActiveMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch group data
  const fetchGroupData = useCallback(async (groupId) => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      // In a real app, you would fetch the group data from your API
      // const response = await api.get(`/groups/${groupId}`);
      // setGroup(response.data);
      
      // For now, using mock data
      const mockGroup = {
        id: groupId,
        name: 'Group Ironmen',
        created_at: new Date().toISOString(),
        members: [
          { id: 1, name: 'Player1', role: 'Leader' },
          { id: 2, name: 'Player2', role: 'Member' },
          { id: 3, name: 'Player3', role: 'Member' },
        ]
      };
      
      setGroup(mockGroup);
      setActiveMember(mockGroup.members[0]);
      setError(null);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh group data
  const refreshGroupData = useCallback(() => {
    if (group?.id) {
      fetchGroupData(group.id);
    }
  }, [group?.id, fetchGroupData]);

  // Update a member's data
  const updateMember = useCallback((memberId, updates) => {
    setGroup(prevGroup => ({
      ...prevGroup,
      members: prevGroup.members.map(member => 
        member.id === memberId ? { ...member, ...updates } : member
      )
    }));
  }, []);

  // Add a new member
  const addMember = useCallback((member) => {
    setGroup(prevGroup => ({
      ...prevGroup,
      members: [...prevGroup.members, { ...member, id: Date.now() }]
    }));
  }, []);

  // Remove a member
  const removeMember = useCallback((memberId) => {
    setGroup(prevGroup => ({
      ...prevGroup,
      members: prevGroup.members.filter(member => member.id !== memberId)
    }));
  }, []);

  // API methods bound to the current group
  const getBoundApiMethod = useCallback((method) => {
    return async (...args) => {
      if (!group?.id) return null;
      return method(group.id, ...args);
    };
  }, [group?.id]);

  // Context value
  const contextValue = {
    // State
    group,
    activeMember,
    loading,
    error,
    
    // Actions
    setActiveMember,
    refreshGroupData,
    updateMember,
    addMember,
    removeMember,
    
    // API methods bound to current group
    getActivities: getBoundApiMethod(api.getActivities),
    createActivity: getBoundApiMethod(api.createActivity),
    getBossStrategies: getBoundApiMethod(api.getBossStrategies),
    createBossStrategy: getBoundApiMethod(api.createBossStrategy),
    getChallenges: getBoundApiMethod(api.getChallenges),
    createChallenge: getBoundApiMethod(api.createChallenge),
    getMilestones: getBoundApiMethod(api.getMilestones),
    createMilestone: getBoundApiMethod(api.createMilestone),
    getEvents: getBoundApiMethod(api.getEvents),
    createEvent: getBoundApiMethod(api.createEvent),
    getSlayerTasks: getBoundApiMethod(api.getSlayerTasks),
    createSlayerTask: getBoundApiMethod(api.createSlayerTask),
    getValuableDrops: getBoundApiMethod(api.getValuableDrops),
    addValuableDrop: getBoundApiMethod(api.addValuableDrop),
  };

  return (
    <GroupContext.Provider value={contextValue}>
      {children}
    </GroupContext.Provider>
  );
};

export default GroupContext;
