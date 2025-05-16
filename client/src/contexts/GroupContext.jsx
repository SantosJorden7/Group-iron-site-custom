import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({
    totalLevel: 0,
    totalExperience: 0,
    combatLevel: 0,
    totalBossKills: 0,
    totalClueScrolls: 0,
    totalRaids: 0
  });

  // Fetch group data
  const fetchGroupData = async (groupId) => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_BASE_URL}/groups/${groupId}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockGroup = {
        id: 'group-123',
        name: 'Iron Legends',
        created_at: '2023-01-15T00:00:00Z',
        members: [
          { id: 'user-1', username: 'IronMan123', rank: 'Leader', joinDate: '2023-01-15' },
          { id: 'user-2', username: 'HardcoreHC', rank: 'Member', joinDate: '2023-01-16' },
          { id: 'user-3', username: 'UltimateIM', rank: 'Member', joinDate: '2023-01-17' },
          { id: 'user-4', username: 'GroupIronWoman', rank: 'Member', joinDate: '2023-01-18' },
        ]
      };
      
      setGroup(mockGroup);
      setMembers(mockGroup.members);
      
      // Mock stats
      setStats({
        totalLevel: 1234,
        totalExperience: 987654321,
        combatLevel: 126,
        totalBossKills: 456,
        totalClueScrolls: 123,
        totalRaids: 45
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching group data:', err);
      setError('Failed to load group data. Please try again later.');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  // Update member stats
  const updateMemberStats = async (memberId, updates) => {
    try {
      // TODO: Implement actual API call to update member stats
      console.log(`Updating member ${memberId} with:`, updates);
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId ? { ...member, ...updates } : member
        )
      );
      
      return { success: true };
    } catch (err) {
      console.error('Error updating member stats:', err);
      return { success: false, error: err.message };
    }
  };

  // Add a new member to the group
  const addMember = async (username) => {
    try {
      // TODO: Implement actual API call to add member
      const newMember = {
        id: `user-${Date.now()}`,
        username,
        rank: 'Member',
        joinDate: new Date().toISOString()
      };
      
      setMembers(prev => [...prev, newMember]);
      return { success: true, member: newMember };
    } catch (err) {
      console.error('Error adding member:', err);
      return { success: false, error: err.message };
    }
  };

  // Remove a member from the group
  const removeMember = async (memberId) => {
    try {
      // TODO: Implement actual API call to remove member
      setMembers(prev => prev.filter(member => member.id !== memberId));
      return { success: true };
    } catch (err) {
      console.error('Error removing member:', err);
      return { success: false, error: err.message };
    }
  };

  // Update group information
  const updateGroup = async (updates) => {
    try {
      // TODO: Implement actual API call to update group
      setGroup(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (err) {
      console.error('Error updating group:', err);
      return { success: false, error: err.message };
    }
  };

  // Load group data on mount
  useEffect(() => {
    // TODO: Get group ID from auth context or URL params
    const groupId = 'group-123';
    fetchGroupData(groupId);
  }, []);

  return (
    <GroupContext.Provider
      value={{
        group,
        members,
        stats,
        loading,
        error,
        updateMemberStats,
        addMember,
        removeMember,
        updateGroup,
        refreshGroupData: fetchGroupData
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

export default GroupContext;
