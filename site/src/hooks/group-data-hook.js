import { useState, useEffect } from 'react';
import { groupData } from '../data/group-data';
import { storage } from '../data/storage';

/**
 * Custom hook to access and subscribe to group data changes
 * This integrates with the site's data system to provide React components
 * with access to the group data
 * 
 * @returns {Object} Group data and related states
 */
export function useGroupData() {
  const [group, setGroup] = useState(storage.getGroup());
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleDataUpdate = () => {
      try {
        const currentGroup = storage.getGroup();
        setGroup(currentGroup);
        
        // Extract members from groupData
        const memberList = Array.from(groupData.members.keys());
        setMembers(memberList);
        
        setLoading(false);
      } catch (err) {
        console.error('Error in useGroupData hook:', err);
        setError(err.message || 'Failed to load group data');
        setLoading(false);
      }
    };

    // Initial load
    handleDataUpdate();
    
    // Subscribe to group data changes
    const unsubscribe = window.addEventListener('group-data-updated', handleDataUpdate);
    
    return () => {
      window.removeEventListener('group-data-updated', handleDataUpdate);
    };
  }, []);

  return {
    group,
    members,
    groupData,
    loading,
    error
  };
}
